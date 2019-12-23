/*
 * Copyright (C) 2019 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 * License-Filename: LICENSE
 */

import {addText} from './addText';
import {addLineText} from './addLineText';
import {addPoint} from './addPoint';
import {addIndices, addLineString} from './addLineString';
import {addPolygon} from './addPolygon';
import {addExtrude} from './addExtrude';
import {addIcon} from './addIcon';

import earcut from 'earcut';

import {getValue} from '../../styleTools';
import {defaultFont} from '../../fontCache';
import {GlyphTexture} from '../GlyphTexture';
import {toRGB} from '../color';
import {IconManager} from '../IconManager';
import {DashAtlas} from '../DashAtlas';

const DEFAULT_STROKE_WIDTH = 1;
const DEFAULT_LINE_CAP = 'round';
const DEFAULT_LINE_JOIN = 'round';
const NONE = '*';
let UNDEF;


const textRefCache = new Map();


const getTextString = (style, feature, level: number) => {
    let text = getValue('text', style, feature, level);

    if (!text && style.textRef) {
        text = textRefCache.get(style.textRef);
        if (text == UNDEF) {
            text = new Function('f', 'return f.' + style.textRef);
            textRefCache.set(style.textRef, text);
        }
        text = text(feature, level);
    }

    if (text != '') {
        if (text !== UNDEF && typeof text != 'string') {
            text = String(text);
        }
        return text;
    }
};


class SymbolData {
    point = [];
    vertex = [];
    texcoord = [];
    size = 2;

    scissor: boolean;

    // aType: Float32ArrayConstructor | Int16ArrayConstructor;

    constructor(scissor, aType?: Float32ArrayConstructor | Int16ArrayConstructor) {
        this.scissor = scissor;
        // this.aType = aType || Int16Array;
    }
}

class FeatureFactory {
    private gl: WebGLRenderingContext;
    private icons: IconManager;
    private dpr: number;

    private dashes: DashAtlas;

    constructor(gl: WebGLRenderingContext, iconManager: IconManager, devicePixelRatio: number) {
        this.gl = gl;
        this.icons = iconManager;
        this.dpr = devicePixelRatio;
        this.dashes = new DashAtlas(gl);
    }

    create(feature, geomType, coordinates, styleGroups, strokeWidthScale, tile, groups, vertexGroups, tileSize: number): boolean {
        const level = tile.z;
        let vertex = vertexGroups[geomType];
        let vertexDataAdded: boolean | number = false;
        let linePointVertexOffsets = null;
        let polyDataAdded = false;
        let extrudeDataAdded = false;
        let vStart;
        let style;
        let zIndex;
        let type;
        let opacity;
        let font;
        let fill;
        let fillRGBA;
        let fillAlpha;
        let rotation;
        let stroke;
        let strokeRGBA;
        let strokeAlpha;
        let strokeWidth;
        let strokeDasharray;
        let strokeLinecap;
        let strokeLinejoin;
        let extrude;
        let radius;
        let width;
        let height;
        let zGrouped;
        let groupId;
        let group;
        let index;
        let iStart;
        let vIndex;
        let offsetX;
        let offsetY;
        let flatPolygon;
        let text;
        let strokeScale;
        let allReady = true;

        if (!vertex) {
            return true;
        }

        vertex = vertex.vertex;
        vStart = vertex.length;

        for (let i = 0, iLen = styleGroups.length; i < iLen; i++) {
            style = styleGroups[i];

            opacity = getValue('opacity', style, feature, level);

            if (opacity === 0) continue;

            if (opacity == UNDEF ||
                opacity >= .98 // no alpha visible -> no need to use more expensive alpha pass
            ) {
                opacity = 1;
            }

            type = getValue('type', style, feature, level);

            // // posId = (x/4)<<16 | (y/4);
            // // if(pmap[posId]){
            // //     continue;
            // // }
            // // pmap[posId] = 1;
            //
            font = UNDEF;
            fill = UNDEF;
            stroke = UNDEF;
            fillRGBA = UNDEF;
            strokeRGBA = UNDEF;
            fillAlpha = 1;
            strokeAlpha = 1;
            strokeWidth = UNDEF;
            strokeDasharray = UNDEF;
            strokeLinecap = UNDEF;
            strokeLinejoin = UNDEF;
            radius = UNDEF;
            width = UNDEF;
            height = UNDEF;
            offsetX = UNDEF;
            offsetY = UNDEF;
            text = UNDEF;
            strokeScale = strokeWidthScale;

            if (type == 'Image') {
                offsetX = getValue('offsetX', style, feature, level) ^ 0;
                offsetY = getValue('offsetY', style, feature, level) ^ 0;

                groupId = 'I' + offsetX + offsetY;
            } else {
                fill = getValue('fill', style, feature, level);
                stroke = getValue('stroke', style, feature, level);
                strokeWidth = getValue('strokeWidth', style, feature, level);

                if (type == 'Line') {
                    if (!stroke) continue;

                    strokeLinecap = getValue('strokeLinecap', style, feature, level) || DEFAULT_LINE_CAP;
                    strokeLinejoin = getValue('strokeLinejoin', style, feature, level) || DEFAULT_LINE_JOIN;
                    strokeDasharray = getValue('strokeDasharray', style, feature, level);

                    if (strokeDasharray instanceof Array) {
                        if (!strokeDasharray.length || !strokeDasharray[0]) {
                            strokeDasharray = UNDEF;
                        }
                    } else {
                        strokeDasharray = UNDEF;
                    }

                    groupId = 'L' + strokeLinecap + strokeLinejoin + (strokeDasharray || NONE);
                } else if (type == 'Polygon') {
                    if (geomType != 'Polygon' && geomType != 'MultiPolygon') {
                        // console.log('skip', geomType, 'for', type);
                        continue;
                    }
                    extrude = getValue('extrude', style, feature, level);

                    if (extrude) {
                        groupId = 'E';
                        type = 'Extrude';
                    } else {
                        // if (stroke) {
                        // groupId = 'PS';
                        // } else
                        {
                            groupId = 'P';
                        }
                    }
                } else {
                    if (geomType == 'Polygon' || geomType == 'MultiPolygon') {
                        continue;
                    }

                    if (type == 'Text') {
                        text = getTextString(style, feature, level);

                        if (!text) {
                            continue;
                        }

                        font = getValue('font', style, feature, level) || defaultFont;

                        groupId = 'T' + (font || NONE);
                    } else if (type == 'Circle') {
                        radius = getValue('radius', style, feature, level);
                        groupId = 'C' + radius || NONE;
                    } else if (type == 'Rect') {
                        width = getValue('width', style, feature, level);
                        height = getValue('height', style, feature, level) || width;

                        groupId = 'R' + width + height;
                    } else {
                        continue;
                    }

                    offsetX = getValue('offsetX', style, feature, level) ^ 0;
                    offsetY = getValue('offsetY', style, feature, level) ^ 0;

                    groupId += offsetX + offsetY;
                }

                if (fill) {
                    fillRGBA = toRGB(fill);
                    fillRGBA[3] *= opacity;
                }

                if (stroke) {
                    strokeRGBA = toRGB(stroke);
                    strokeRGBA[3] *= opacity;

                    if (type == 'Text') {
                        // don't apply stroke-scale to text rendering
                        strokeScale = 1;
                    }

                    if (typeof strokeWidth != 'number') {
                        strokeWidth = DEFAULT_STROKE_WIDTH;
                    } else {
                        strokeWidth *= strokeScale;
                    }
                }

                groupId += (stroke || NONE) + (strokeWidth || NONE) + (fill || NONE);
            }


            groupId += opacity * 100 ^ 0;


            if (rotation = getValue('rotation', style, feature, level) ^ 0) {
                groupId += 'R' + rotation;
            }

            zIndex = getValue('zIndex', style, feature, level);

            zGrouped = groups[zIndex] = groups[zIndex] || [];
            index = zGrouped[groupId];

            // console.log(groups);

            if (index == UNDEF) {
                index = zGrouped[groupId] = zGrouped.length;
                group = zGrouped[index] = {
                    type: type,
                    shared: {
                        font: font,
                        fill: fillRGBA, // && fillRGBA.slice(0, 3),
                        opacity: opacity,
                        stroke: strokeRGBA, // && strokeRGBA.slice(0, 3),
                        strokeWidth: strokeWidth,
                        strokeLinecap: strokeLinecap,
                        strokeLinejoin: strokeLinejoin,
                        strokeDasharray: strokeDasharray,
                        width: width,
                        height: height,
                        radius: radius,
                        rotation: rotation,
                        offsetX: offsetX,
                        offsetY: offsetY
                    },
                    index: []
                };
            } else {
                group = zGrouped[index];
            }

            vIndex = group.index;

            // if(type == 'Image')debugger;

            if (geomType == 'Point') {
                if (type == 'Text') {
                    let glyphs = group.glyphs;

                    if (!glyphs) {
                        // console.time('create Glyph Tex');
                        glyphs = group.glyphs = new GlyphTexture(this.gl, style);
                        // console.timeEnd('create Glyph Tex');
                        group.first = 0;
                        group.data = new SymbolData(false);
                    }


                    vertex = group.data.vertex;

                    const collision = style.collide;

                    addText(
                        text,
                        group.data.point,
                        group.data.vertex,
                        group.data.texcoord,
                        coordinates,
                        glyphs,
                        tile,
                        collision == UNDEF
                            ? true
                            : collision,
                        tileSize,
                        offsetX,
                        offsetY
                    );

                    group.last = vertex.length;
                } else {
                    if (type == 'Image') {
                        let src = getValue('src', style, feature, level);
                        let width = getValue('width', style, feature, level);
                        let height = getValue('height', style, feature, level) || width;

                        if (!group.data) {
                            group.first = 0;
                            group.data = new SymbolData(false);
                        }
                        const iGrp = group.data;

                        let img = this.icons.get(src, width, height);

                        if (!img) {
                            allReady = false;
                            continue;
                        }
                        // const iGrp = vertexGroups.Icon;
                        addIcon(
                            img, width, height,
                            iGrp.point, iGrp.vertex, iGrp.texcoord,
                            coordinates,
                            tile,
                            tileSize
                        );
                        group.texture = this.icons.getTexture();
                        group.last = iGrp.vertex.length;
                    } else if (type == 'Circle' || type == 'Rect') {
                        if (!vertexDataAdded) {
                            vertexDataAdded = true;
                            if (!addPoint(vertex, coordinates, tile, tileSize)) {
                                // in case of point has not been added because it's not inside tile
                                // -> we can skip it.
                                return allReady;
                            }
                        }
                        vIndex[vIndex.length] = vertex.length / 2 - 1;
                    }
                }
            } else {
                if (geomType == 'LineString') {
                    if (type == 'Line') {
                        // iStart = vStart / 2;
                        // const vLength = iStart + (coordinates.length - 1) * 6;
                        let vGroup = vertexGroups.LineString;
                        let lineCap = strokeLinecap;
                        let lineJoin = strokeLinejoin;

                        if (strokeDasharray) {
                            group.texture = this.dashes.get(strokeDasharray);
                            // lineCap = 'butt';
                            lineCap = false;
                            lineJoin = false;
                        }

                        if (vertexDataAdded === false) {
                            // number of ls segements
                            vertexDataAdded = addLineString(vertex, vGroup.normal, vGroup.lengthSoFar, vIndex, coordinates, tile, tileSize, lineCap, lineJoin);
                        } else {
                            addIndices(vStart / 2, <number>vertexDataAdded, vIndex, lineCap);
                        }
                    } else if (type == 'Circle' || type == 'Rect') {
                        vertex = vertexGroups.Point.vertex;
                        vStart = vertex.length;

                        if (linePointVertexOffsets == null) {
                            linePointVertexOffsets = [vStart / 2, vStart / 2];
                            for (let c = 0, i; c < coordinates.length; c++) {
                                if (i = addPoint(vertex, coordinates[c], tile, tileSize)) {
                                    linePointVertexOffsets[1] = i / 2;
                                }
                            }
                        }

                        for (let c = linePointVertexOffsets[0], len = linePointVertexOffsets[1]; c < len; c++) {
                            vIndex[vIndex.length] = c;
                        }
                    } else if (type == 'Text') {
                        let glyphs = group.glyphs;

                        if (!glyphs) {
                            // console.time('create Glyph Tex');
                            glyphs = group.glyphs = new GlyphTexture(this.gl, style);
                            // console.timeEnd('create Glyph Tex');
                            group.first = 0;
                            group.data = new SymbolData(false, Float32Array);
                        }

                        // glyphs.addChars(text);

                        vertex = group.data.vertex;

                        addLineText(text, group.data.point, vertex, group.data.texcoord, coordinates, glyphs, tile, tileSize, offsetX, offsetY);
                        group.last = vertex.length;
                    }
                } else {
                    // Polygon geometry
                    if (type == 'Extrude') {
                        vertex = vertexGroups.Extrude.vertex;
                        vStart = vertex.length;

                        if (!extrudeDataAdded) {
                            extrudeDataAdded = true;
                            flatPolygon = addExtrude(vertex, vertexGroups.Extrude.normal, vIndex, coordinates, tile, tileSize, extrude);
                        }
                    } else if (type == 'Polygon') {
                        if (!polyDataAdded) {
                            polyDataAdded = true;
                            flatPolygon = addPolygon(vertex, coordinates, tile, tileSize);
                        } else {
                            // debugger;
                        }
                    } else if (type == 'Line') {
                        if (strokeDasharray) {
                            group.texture = this.dashes.get(strokeDasharray);
                        }
                        const vGroup = vertexGroups.LineString;
                        for (let ls of coordinates) {
                            addLineString(vGroup.vertex, vGroup.normal, vGroup.lengthSoFar, vIndex, ls, tile, tileSize);
                        }
                        continue;
                    }
                    // if (!feature.geometry._xyz) debugger;

                    let triangles = feature.geometry._xyz ||
                        earcut(flatPolygon.vertices, flatPolygon.holes, flatPolygon.dimensions);

                    iStart = vStart / flatPolygon.dimensions;


                    for (let t = 0; t < triangles.length; t++) {
                        // vIndex[vIndex.length] = iStart + triangles[t];
                        vIndex.push(iStart + triangles[t]);
                    }
                }
            }
        }
        return allReady;
    }
}

export {FeatureFactory};
