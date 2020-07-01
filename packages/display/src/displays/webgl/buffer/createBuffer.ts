/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
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

import {TaskManager} from '@here/xyz-maps-common';
import {GeometryBuffer} from './GeometryBuffer';
import {getValue} from '../../styleTools';
import {tile} from '@here/xyz-maps-core';
import {Layer} from '../../Layers';
import {FeatureFactory} from './FeatureFactory';
import {TemplateBuffer} from './templates/TemplateBuffer';


const tileUtils = tile.Utils;

// const DEFAULT_STROKE_WIDTH_ZOOM_SCALE = () => 1;
const PROCESS_FEATURE_BUNDLE_SIZE = 16;
const EXCLUSIVE_TIME_MS = 4;
const PRIORITY = 4;

const taskManager = TaskManager.getInstance();
const TO_RAD = Math.PI / 180;
const COLOR_UNDEFINED = new Float32Array([-1.0, -1.0, -1.0, -1.0]);

let UNDEF;


type Tile = tile.Tile;

const handlePolygons = (factory: FeatureFactory, feature, coordinates, styleGroups, lsScale, tile) => {
    const zoom = factory.z;

    for (let style of styleGroups) {
        const styleType = style.type;
        const type = getValue('type', style, feature, zoom);

        if (type == 'Text') {
            const bbox = feature.bbox;
            const center = [bbox[0] + (bbox[2] - bbox[0]) / 2, bbox[1] + (bbox[3] - bbox[1]) / 2];
            const cx = center[0];
            const cy = center[1];
            const tileBounds = tile.bounds;
            if (cx >= tileBounds[0] && cy >= tileBounds[1] && cx < tileBounds[2] && cy < tileBounds[3]) {
                factory.create(feature, 'Point', center, [style], lsScale);
            }
        } else if ((type == 'Polygon' || type == 'Line') && getValue('stroke', style, feature, zoom)) {
            style.type = 'Line';
            for (let linestring of coordinates) {
                factory.create(feature, 'LineString', linestring, [style], lsScale, tile.clipped);
            }
            style.type = styleType;
        }
    }
};


const typeArray = (TypedArray, arr: any[], typedCache: any) => {
    let typedArr = typedCache.get(arr);
    if (!typedArr) {
        typedArr = new TypedArray(arr);
        typedCache.set(arr, typedArr);
    }
    return typedArr;
};

const createBuffer = (
    data: any[],
    renderLayer: Layer,
    tileSize: number,
    tile: Tile,
    factory: FeatureFactory,
    onInit: () => void,
    onDone: (data: GeometryBuffer[], imagesLoaded: boolean) => void
) => {
    const {layer} = renderLayer;
    const groups = {};
    let iconsLoaded = true;

    const task = taskManager.create({

        time: EXCLUSIVE_TIME_MS,

        priority: PRIORITY,

        init: function() {
            // tile.isPreparing = task;
            // const layerStyles = layer.getStyle();

            if (data) {
                let len = data.length;
                let feature;
                let start = Date.now();

                while (len--) {
                    feature = data[len];
                }

                // adjust remaining runtime of task
                task.time = EXCLUSIVE_TIME_MS - (Date.now() - start);
            }

            const zoomlevel = tile.z + layer.levelOffset;
            const layerStyles = layer.getStyle();
            let lsZoomScale = 1; // DEFAULT_STROKE_WIDTH_ZOOM_SCALE;

            if (layerStyles) {
                const layerScale = layerStyles['strokeWidthZoomScale'] || layerStyles['LineStringZoomScale'];

                if (layerScale) {
                    lsZoomScale = layerScale(zoomlevel);
                }
            }

            if (onInit) {
                onInit();
            }

            factory.init(tile, groups, tileSize, zoomlevel);

            return [
                tile,
                data,
                lsZoomScale,
                0, // featureIndex
                PROCESS_FEATURE_BUNDLE_SIZE,
                layer,
                zoomlevel
            ];
        },

        name: 'createBuffer',

        onDone: function(args) {
            const z = args[6];
            let extrudeScale = Math.pow(2, 17 - z);
            let buffers = [];
            let geoBuffer: GeometryBuffer;
            let grpBuffer: TemplateBuffer;
            let zGroup;
            let grp;
            let type;
            let shared;
            let stroke;
            let strokeWidth;
            let vertexType;

            // let z = groups.length;
            // for (let z = 0; z < groups.length; z++) {
            // while (z--) {
            for (let zoom in groups) {
                let z: string | number = zoom;
                zGroup = groups[z];

                if (zGroup) {
                    for (let g = 0; g < zGroup.length; g++) {
                        grp = zGroup[g];
                        type = grp.type;
                        shared = grp.shared;
                        stroke = shared.stroke;
                        strokeWidth = shared.strokeWidth;
                        vertexType = type;
                        grpBuffer = grp.buffer;

                        if (vertexType == 'Text') {
                            if (!grp.glyphs) { // TODO: CLEANUP!!
                                continue;
                            }
                        }

                        if (!grpBuffer || grpBuffer.isEmpty()) {
                            // nothing to render..no need to create empty buffers -> skip.
                            continue;
                        }

                        if (grpBuffer.hasIndex()) {
                            const index = grpBuffer.index();
                            if (!index.length) continue;

                            geoBuffer = new GeometryBuffer(index, type, grpBuffer.i32);
                        } else {
                            geoBuffer = new GeometryBuffer({
                                first: grpBuffer.first,
                                count: grpBuffer.count()
                            }, type);
                        }


                        const {attributes} = grpBuffer;

                        for (let name in attributes) {
                            let attr = attributes[name];
                            if (attr.data.length) {
                                geoBuffer.addAttribute(name, grpBuffer.trimAttribute(attr));
                            }
                        }

                        buffers.push(geoBuffer);


                        if (type == 'Text') {
                            // geoGroup.alpha = true;
                            geoBuffer.texture = grp.glyphs;
                            geoBuffer.scissor = grpBuffer.scissor;

                            grp.glyphs.sync();

                            // factory.collisions.setAttribute(geoBuffer.attributes.a_point);

                            geoBuffer.addUniform('u_texture', 0);
                            geoBuffer.addUniform('u_atlasScale', [1 / grp.glyphs.width, 1 / grp.glyphs.height]);
                            geoBuffer.addUniform('u_opacity', shared.opacity);
                            geoBuffer.addUniform('u_alignMap', shared.alignment == 'map');
                        } else {
                            if (type == 'Rect' || type == 'Circle') {
                                geoBuffer.addUniform('u_fill', shared.fill || COLOR_UNDEFINED);

                                if (stroke) {
                                    geoBuffer.addUniform('u_stroke', stroke);
                                    if (strokeWidth == UNDEF) strokeWidth = 1;
                                }

                                geoBuffer.addUniform('u_strokeWidth', strokeWidth ^ 0);

                                if (type == 'Circle') {
                                    geoBuffer.addUniform('u_radius', shared.radius);
                                } else {
                                    geoBuffer.addUniform('u_size', [shared.width, shared.height]);
                                }
                            } else if (type == 'Line') {
                                if (shared.strokeDasharray) {
                                    geoBuffer.type = 'DashedLine';
                                    geoBuffer.texture = grp.texture;
                                    geoBuffer.addUniform('u_texWidth', grp.texture.width);
                                    geoBuffer.addUniform('u_pattern', 0);
                                }
                                geoBuffer.addUniform('u_fill', stroke);
                                geoBuffer.addUniform('u_strokeWidth', strokeWidth * .5);

                                geoBuffer.alpha = true;
                                // geoBuffer.blend = true;
                            } else if (type == 'Polygon' || type == 'Extrude') {
                                geoBuffer.addUniform('u_fill', shared.fill);

                                if (type == 'Extrude') {
                                    geoBuffer.addUniform('u_zoom', extrudeScale);
                                }
                            } else if (type == 'Icon') {
                                geoBuffer.texture = grp.texture;
                                geoBuffer.scissor = grp.buffer.scissor;

                                geoBuffer.addUniform('u_atlasScale', 1 / geoBuffer.texture.width);
                                geoBuffer.addUniform('u_texture', 0);
                                geoBuffer.addUniform('u_opacity', shared.opacity);
                            }
                        }

                        const fillOpacity = shared.fill && shared.fill[3];
                        const strokeOpacity = shared.stroke && shared.stroke[3];

                        if (fillOpacity < 1 || strokeOpacity < 1) {
                            geoBuffer.alpha = true;
                            geoBuffer.blend = true;
                            geoBuffer.depth = true;
                        }

                        geoBuffer.addUniform('u_rotation', shared.rotation * TO_RAD);
                        geoBuffer.addUniform('u_offset', [shared.offsetX, shared.offsetY]);

                        if (z == 'top') {
                            z = Infinity;
                            geoBuffer.alpha = true;
                            // make sure opaque items are rendered in alpha pass
                            geoBuffer.depth = false;
                        }

                        z = Number(z);

                        renderLayer.addZ(z);
                        geoBuffer.zIndex = z;

                        // TODO: order (+draw) groups by zIndex
                        // geoBuffer.groups.unshift(geoGroup);
                        // geoBuffer.addGroup(geoGroup);
                    }
                }
            }

            onDone(buffers.reverse(), iconsLoaded);
        },

        exec: function(heap) {
            let tile = heap[0];
            let data = heap[1];
            const lsScale = heap[2];
            let displayLayer = heap[5];
            let dataLen = data.length;

            const level = heap[6];
            let styleGroups;
            let feature;
            // const pmap = heap[6];
            let geom;
            let geomType;

            // window.prevFeature = null;

            while (heap[4]--) {
                if (feature = data[heap[3]++]) {
                    styleGroups = displayLayer.getStyleGroup(feature, level);


                    if (styleGroups) {
                        geom = feature.geometry;
                        geomType = geom.type;

                        if (!styleGroups.length) {
                            styleGroups = [styleGroups];
                        }

                        // const coordinates = geom.coordinates;
                        const coordinates = feature.getProvider().decCoord(feature);

                        if (geomType == 'MultiLineString' || geomType == 'MultiPoint') {
                            let simpleType = geomType == 'MultiPoint' ? 'Point' : 'LineString';

                            for (let coords of coordinates) {
                                factory.create(feature, simpleType, coords, styleGroups, lsScale);
                            }
                        } else if (geomType == 'MultiPolygon') {
                            factory.create(feature, 'Polygon', coordinates, styleGroups, lsScale);

                            for (let polygon of coordinates) {
                                handlePolygons(factory, feature, polygon, styleGroups, lsScale, tile);
                            }
                        } else {
                            let ready = factory.create(feature, geomType, coordinates, styleGroups, lsScale);

                            if (!ready) {
                                iconsLoaded = false;
                            }

                            if (geomType == 'Polygon') {
                                handlePolygons(factory, feature, coordinates, styleGroups, lsScale, tile);
                            }
                        }
                    }

                    // else console.log('render dupl!', link, tile);
                } else {
                    // feature count < bundle size -> next
                    break;
                }
            }

            heap[4] = PROCESS_FEATURE_BUNDLE_SIZE;

            return heap[3] < dataLen;
        }
        // icb(groups);
    });

    taskManager.start(task);
    return task;
}
;

export {createBuffer};
