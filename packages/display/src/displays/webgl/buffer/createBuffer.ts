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

import {TaskManager} from '@here/xyz-maps-common';
import {GeometryBuffer} from './GeometryBuffer';
import {GeometryGroup} from './GeometryGroup';
// import {addFeature} from './addFeature';
import {getValue} from '../../styleTools';
import {tile} from '@here/xyz-maps-core';
import {Layer} from '../../Layers';
// import {IconManager} from '../IconManager';
import {FeatureFactory} from './FeatureFactory';


const tileUtils = tile.Utils;

// const DEFAULT_STROKE_WIDTH_ZOOM_SCALE = () => 1;
const PROCESS_FEATURE_BUNDLE_SIZE = 32;
const EXCLUSIVE_TIME_MS = 4;
const PRIORITY = 4;

const taskManager = TaskManager.getInstance();
const DELTA_LON_ZOOMLEVEL_17 = 0.00274658203125;
const TO_RAD = Math.PI / 180;
const COLOR_UNDEFINED = new Float32Array([-1.0, -1.0, -1.0, -1.0]);

let UNDEF;

const handlePolygons = (factory, feature, coordinates, styleGroups, lsScale, tile, groups, vertexGroups, tileSize: number) => {
    const zoom = tile.z;
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
                factory.create(
                    feature, 'Point', center, [style], lsScale,
                    tile, groups, vertexGroups, tileSize
                );
            }
        } else if (type == 'Polygon' && getValue('stroke', style, feature, zoom)) {
            style.type = 'Line';
            for (let linestring of coordinates) {
                factory.create(
                    feature, 'LineString', linestring, [style], lsScale,
                    tile, groups, vertexGroups, tileSize
                );
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

const createBuffer = (data: any[], renderLayer: Layer, tileSize: number, tile, factory: FeatureFactory, onDone) => {
// const createBuffer = (data: any[], renderLayer: Layer, tileSize: number, tile, gl: WebGLRenderingContext, iconManager: IconManager, onDone) => {
    const layer = renderLayer.layer;

    // glyphManager = {
    //     texture: null,
    //     glyphs: null
    // }
    // TODO: clenaup restructure group creation!
    const vertexGroups = {
        'Polygon': {
            vertex: [],
            size: 2,
            stride: 0// 3*2
        },
        'LineString': {
            vertex: [],
            normal: [],
            lengthSoFar: [],
            size: 2,
            type: Float32Array
        },
        'Extrude': {
            normal: [],
            vertex: [],
            size: 3,
            stride: 0
        },
        'Point': {
            vertex: [],
            size: 2,
            type: Int16Array
        }
        // 'Icon': {
        //     point: [],
        //     vertex: [],
        //     texcoord: [],
        //     size: 2
        // }
        // 'Text': {
        //     point: [],
        //     vertex: [],
        //     texcoord: [],
        //     size: 2
        // }
    };

    // const exclusiveTimeMS = this.ms;

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

            const layerStyles = layer.getStyle();
            let lsZoomScale = 1; // DEFAULT_STROKE_WIDTH_ZOOM_SCALE;

            if (layerStyles) {
                const layerScale = layerStyles['strokeWidthZoomScale'] || layerStyles['LineStringZoomScale'];

                if (layerScale) {
                    lsZoomScale = layerScale(tile.z);
                }
            }


            let provider = tile.provider;
            let rendered = [];
            let overlaps = [];

            // console.time(tile.quadkey);
            for (let y = -1; y < 2; y++) {
                for (let x = -1; x < 2; x++) {
                    if (x != 0 || y != 0) {
                        let qk = tileUtils.tileXYToQuadKey(tile.z, tile.y + y, tile.x + x);
                        let neighbour = provider.getCachedTile(qk);
                        if (neighbour && neighbour.collision) {
                            let ren = neighbour.collision.rendered;
                            for (let o of ren) {
                                overlaps[overlaps.length] = o;
                            }
                        }
                    }
                }
            }
            // console.timeEnd(tile.quadkey);


            tile.collision = {
                rendered: rendered,
                overlaps: overlaps
            };


            return [
                tile,
                // {
                //     x: tile.x,
                //     y: tile.y,
                //     z: tile.z,
                //     lon2x: (x: number) => tile.lon2x(x, tileSize),
                //     lat2y: (y: number) => tile.lat2y(y, tileSize),
                //     isInside: (p: [number, number, number?]) => tile.isInside(p),
                //     collision: tile.collision
                // },
                data,
                lsZoomScale,
                0, // featureIndex
                PROCESS_FEATURE_BUNDLE_SIZE,
                layer,
                tileSize
                // {}
            ];
        },

        name: 'createBuffer',

        onDone: function() {
            // if(tile.quadkey != '023013221213200122')return onDone([], this);
            let geomBuffers = {};
            let tArrayCache = new WeakMap();
            let buffers = [];
            let zGroup;
            let grp;
            let type;
            let shared;
            let stroke;
            let strokeWidth;
            let geoBuffer: GeometryBuffer;
            let vertexType;
            let vertexGroup;

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
                        geoBuffer = geomBuffers[type];


                        vertexType = type == 'Line'
                            ? 'LineString'
                            : (type == 'Polygon' || type == 'Extrude' || type == 'Text')
                                ? type
                                // : 'Point';
                                : type == 'Image'
                                    ? 'Icon'
                                    : 'Point';

                        vertexGroup = grp.data || vertexGroups[vertexType];

                        if (!geoBuffer) {
                            if (vertexType == 'Text') {
                                if (!grp.glyphs) { // TODO: CLEANUP!!
                                    continue;
                                }
                                // vertexGroup = grp.data;
                            }
                            // else {
                            //     vertexGroup = vertexGroups[vertexType];
                            // }


                            if (!vertexGroup || !vertexGroup.vertex.length) {
                                // nothing to render..no need to create empty buffers -> skip.
                                continue;
                            }

                            geoBuffer = new GeometryBuffer();

                            if (vertexType == 'Text') {
                                geoBuffer.addAttribute('a_point', {
                                    data: typeArray(Int16Array, vertexGroup.point, tArrayCache),
                                    size: 3,
                                    // size: vertexGroup.size,
                                    stride: vertexGroup.stride
                                });
                            } else if (vertexType == 'Icon') {
                                geoBuffer.addAttribute('a_point', {
                                    data: typeArray(Int8Array, vertexGroup.point, tArrayCache),
                                    size: vertexGroup.size,
                                    stride: vertexGroup.stride
                                });

                                geoBuffer.addAttribute('a_texcoord', {
                                    data: typeArray(Uint16Array, vertexGroup.texcoord, tArrayCache),
                                    size: vertexGroup.size,
                                    stride: vertexGroup.stride
                                });
                            }

                            geoBuffer.addAttribute('a_position', {
                                data: typeArray(vertexGroup.type || Float32Array, vertexGroup.vertex, tArrayCache),
                                size: vertexGroup.size,
                                stride: vertexGroup.stride
                            });

                            buffers.push(geoBuffer);

                            if (grp.index.length) {
                                // if (type != 'Image' && type != 'Text') {
                                // TODO: clenup -> icon/text not using index..so can't be shared..
                                geomBuffers[type] = geoBuffer;
                            }
                        }

                        let geoGroup: GeometryGroup;
                        let vGroup;
                        let size;

                        if (grp.last != UNDEF) {
                            vGroup = grp.data;
                            size = vGroup.size;
                            const first = grp.first / size;

                            geoGroup = new GeometryGroup({
                                first: first,
                                count: grp.last / size - first
                            }, vertexType);
                        } else {
                            if (!grp.index.length) continue;
                            geoGroup = geoBuffer.createGroup(grp.index, type);
                        }

                        if (type == 'Text') {
                            // text
                            geoGroup.addAttribute('a_texcoord', {
                                data: typeArray(Float32Array, vGroup.texcoord, tArrayCache),
                                size: size,
                                stride: vGroup.stride
                            });
                            // geoGroup.alpha = true;
                            geoGroup.texture = grp.glyphs;
                            geoGroup.scissor = vGroup.scissor;

                            // const t = performance.now();
                            grp.glyphs.sync();
                            // console.log('glyph time', grp.glyphs.time, 'ms', 'sync',performance.now()-t,'ms');

                            geoGroup.addUniform('u_texture', 0);
                            geoGroup.addUniform('u_atlasScale', [1 / grp.glyphs.width, 1 / grp.glyphs.height]);
                            geoGroup.addUniform('u_opacity', shared.opacity);
                        } else {
                            if (type == 'Rect' || type == 'Circle') {
                                geoGroup.addUniform('u_fill', shared.fill || COLOR_UNDEFINED);

                                if (stroke) {
                                    geoGroup.addUniform('u_stroke', stroke);
                                    if (strokeWidth == UNDEF) strokeWidth = 1;
                                }

                                geoGroup.addUniform('u_strokeWidth', strokeWidth ^ 0);

                                if (type == 'Circle') {
                                    geoGroup.addUniform('u_radius', shared.radius);
                                } else {
                                    geoGroup.addUniform('u_size', [shared.width, shared.height]);
                                }
                            } else if (type == 'Line') {
                                geoGroup.addAttribute('a_normal', {
                                    data: typeArray(Int8Array, vertexGroups.LineString.normal, tArrayCache),
                                    normalized: true,
                                    size: 2
                                });

                                let capScale = 1 / .7;
                                if (shared.strokeDasharray) {
                                    geoGroup.type = 'DashedLine';
                                    geoGroup.texture = grp.texture;
                                    geoGroup.addUniform('u_texWidth', grp.texture.width);
                                    geoGroup.addUniform('u_pattern', 0);
                                    geoGroup.addAttribute('a_lengthSoFar', {
                                        data: typeArray(Uint16Array, vertexGroups.LineString.lengthSoFar, tArrayCache),
                                        normalized: false,
                                        size: 1
                                    });
                                    capScale = 1;
                                }
                                geoGroup.addUniform('u_capScale', capScale);
                                geoGroup.addUniform('u_fill', stroke);
                                geoGroup.addUniform('u_strokeWidth', strokeWidth * .5);
                            } else if (type == 'Polygon' || type == 'Extrude') {
                                geoGroup.addUniform('u_fill', shared.fill);
                                geoGroup.addUniform('u_zoom', (tile.bounds[2] - tile.bounds[0]) / DELTA_LON_ZOOMLEVEL_17);

                                if (type == 'Extrude') {
                                    geoGroup.addAttribute('a_normal', {
                                        data: typeArray(Float32Array, vertexGroups.Extrude.normal, tArrayCache),
                                        normalized: false,
                                        size: 3
                                    });
                                }
                            } else if (type == 'Image') {
                                geoGroup.texture = grp.texture;

                                // geoGroup.alpha = true;
                                geoGroup.scissor = grp.data.scissor;
                                // geoGroup = new GeometryGroup({
                                //     first: 0,
                                //     count: vertexGroup.point.length / 2
                                // }, 'Icon');

                                geoGroup.addUniform('u_atlasScale', 1 / geoGroup.texture.width);
                                geoGroup.addUniform('u_texture', 0);
                                geoGroup.addUniform('u_opacity', shared.opacity);
                            }
                        }

                        const fillOpacity = shared.fill && shared.fill[3];
                        const strokeOpacity = shared.stroke && shared.stroke[3];

                        if (fillOpacity < 1 || strokeOpacity < 1) {
                            geoGroup.alpha = true;
                            geoGroup.blend = true;
                            geoGroup.depth = true;
                        }

                        geoGroup.addUniform('u_rotation', shared.rotation * TO_RAD);

                        geoGroup.addUniform('u_offset', [shared.offsetX, shared.offsetY]);

                        if (z == 'top') {
                            z = Infinity;
                            geoGroup.alpha = true;
                            // make sure opaque items are rendered in alpha pass
                            geoGroup.depth = false;
                        }

                        z = Number(z);

                        renderLayer.addZ(z);
                        geoGroup.zIndex = z;

                        // TODO: order (+draw) groups by zIndex
                        geoBuffer.groups.unshift(geoGroup);
                        // geoBuffer.addGroup(geoGroup);
                    }
                }
            }

            // console.log(buffers);
            onDone(buffers.reverse(), iconsLoaded);
        },

        exec: function(heap) {
            let tile = heap[0];
            let data = heap[1];
            const lsScale = heap[2];
            let displayLayer = heap[5];
            let tileSize = heap[6];
            let dataLen = data.length;

            const level = tile.z;
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

                        if (geomType == 'MultiLineString') {
                            for (let linestring of coordinates) {
                                factory.create(
                                    feature, 'LineString', linestring, styleGroups, lsScale,
                                    tile, groups, vertexGroups, tileSize
                                );
                            }
                        } else if (geomType == 'MultiPolygon') {
                            let _xyzGeom = geom._xyz;
                            if (_xyzGeom) {
                                factory.create(
                                    feature, 'Polygon', coordinates, styleGroups, lsScale,
                                    tile, groups, vertexGroups, tileSize
                                );
                            }
                            for (let polygon of coordinates) {
                                if (!_xyzGeom) {
                                    factory.create(
                                        feature, 'Polygon', polygon, styleGroups, lsScale,
                                        tile, groups, vertexGroups, tileSize
                                    );
                                }
                                handlePolygons(factory,
                                    feature, polygon, styleGroups, lsScale,
                                    tile, groups, vertexGroups, tileSize
                                );
                            }
                        } else {
                            let ready = factory.create(
                                feature, geomType, coordinates, styleGroups, lsScale,
                                tile, groups, vertexGroups, tileSize
                            );

                            if (!ready) {
                                iconsLoaded = false;
                            }

                            if (geomType == 'Polygon') {
                                handlePolygons(factory,
                                    feature, coordinates, styleGroups, lsScale,
                                    tile, groups, vertexGroups, tileSize
                                );
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
};

export {createBuffer};
