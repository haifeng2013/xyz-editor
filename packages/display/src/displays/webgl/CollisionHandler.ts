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

import {tile} from '@here/xyz-maps-core';
import Display from './Display';
import {Attribute} from './buffer/Attribute';

const tileUtils = tile.Utils;
type Tile = tile.Tile;

type BBox = { minX: number, maxX: number, minY: number, maxY: number };

type AttributeInfo = { start: number, attr: Attribute };
type Collision = { rendered: any[]; neighbours: BBox[], attrInfo: AttributeInfo[] }


export class CollisionHandler {
    tiles: Map<string, Collision>;

    tileCollision: Collision;

    private display: Display;

    constructor(display) {
        this.tiles = new Map();
        this.display = display;
    }

    private intersects(box1: BBox, data: BBox[], i: number = 0) {
        // for (let bbox2 of data) {
        for (let len = data.length, bbox2; i < len; i++) {
            bbox2 = data[i];
            if (box1.minX <= bbox2.maxX && bbox2.minX <= box1.maxX && box1.minY <= bbox2.maxY && bbox2.minY <= box1.maxY) {
                return true;
            }
        }
    }

    init(quadkey: string, tileX: number, tileY: number, tileZ: number, tileSize: number) {
        // console.log('init', quadkey, tileSize);
        console.time(quadkey);

        let collisionData = this.tiles.get(quadkey);

        if (!collisionData) {
            const neighbours = [];

            for (let y = -1; y < 2; y++) {
                for (let x = -1; x < 2; x++) {
                    if (x != 0 || y != 0) {
                        let qk = tileUtils.tileXYToQuadKey(tileZ, tileY + y, tileX + x);
                        // let dtile = <GLTile> this.display.buckets.get(qk, true);
                        // let qk = tileUtils.tileXYToQuadKey(tile.z, tile.y + y, tile.x + x);
                        // let neighbour = provider.getCachedTile(qk);
                        // if (neighbour && neighbour.collision) {
                        //     let ren = neighbour.collision.rendered;
                        let collisions = this.tiles.get(qk);
                        if (collisions) {
                            let ren = collisions.rendered;
                            for (let o of ren) {
                                // debugger;
                                neighbours[neighbours.length] = o;
                            }
                        }
                    }
                }
            }

            this.tiles.set(quadkey, collisionData = {
                rendered: [],
                neighbours: neighbours,
                attrInfo: []
            });
        }

        collisionData.attrInfo.push({
            start: collisionData.rendered.length,
            attr: null
        });

        this.tileCollision = collisionData;

        console.timeEnd(quadkey);

        // this.tiles.set(tile, this.tileCollision);
    }

    setAttribute(attribute: Attribute) {
        const {tileCollision} = this;
        const {attrInfo} = tileCollision;

        attrInfo[attrInfo.length - 1].attr = attribute;
    }

    getAttribute(index: number, attrInfo: AttributeInfo[]): Attribute {
        // const {tileCollision} = this;
        // const {attrInfo} = tileCollision;
        let _attr;
        let i = attrInfo.length;

        while (i--) {
            _attr = attrInfo[i];
            if (index >= _attr.start) {
                return _attr.attr;
            }
        }
    }

    collides(
        cx: number,
        cy: number,
        width: number,
        height: number,
        tile: Tile,
        tileSize: number,
        fontInfo,
        bufferOffsetStart: number,
        bufferOffsetEnd: number
    ) {
        // const tileX = tile.x * tileSize;
        // const tileY = tile.y * tileSize;

        let tileX = tile.x * tileSize;
        let tileY = tile.y * tileSize;


        // debugger;

        // const estimatedTextWidth = fontInfo.getTextWidth(text);
        // const estimatedTextWidth = fontInfo.avgCharWidth * text.length / 2;

        // console.time('cntGlyphs');
        // let glyphs = 0;
        // for (let c of text) {
        //     if (c != ' ') glyphs++;
        // }
        // console.timeEnd('cntGlyphs');

        const x1 = tileX + cx - width;
        const x2 = tileX + cx + width;
        const y1 = tileY + cy - height;
        const y2 = tileY + cy + height;


        if (tileSize == 256) {
            tileX = (tile.x * .5 ^ 0) * 512;
            tileY = (tile.y * .5 ^ 0) * 512;
        }

        // console.log(tile,'tileSize',tileSize,'->',tileX,tileY);
        // console.log(x1,y1,x2,y2);

        const collisionInfo = this.tileCollision;
        // const collisionInfo = tile.collision;
        const rendered = collisionInfo.rendered;

        const bbox = {
            minX: x1,
            maxX: x2,
            minY: y1,
            maxY: y2,
            tileX: tileX,
            tileY: tileY,
            bos: bufferOffsetStart,
            boe: bufferOffsetEnd,
            attrInfo: collisionInfo.attrInfo
            // bos: bufferIndex,
            // boe: bufferIndex + glyphs * 18
        };


        if (this.intersects(bbox, rendered) || this.intersects(bbox, collisionInfo.neighbours)) {
            return true;
        }

        rendered.push(bbox);
    }


    update(tiles) {
        // return;

        // this._t = tiles;
        // console.log('####', 'updateCollisions', '####');
        // console.log(tiles);
        // console.log(collisionData);
        // console.time('update-collisions');

        const {display} = this;
        let rendered = [];

        for (let screentile of tiles) {
            let quadkey = screentile.tile.quadkey;

            let collisions = this.tiles.get(quadkey);

            // console.log(collisions);

            if (collisions && !collisions.attrInfo.length) debugger;

            if (collisions /* && collisions.attrInfo && collisions.attrInfo.buffer */) {
                for (let i = 0, _rendered = collisions.rendered; i < _rendered.length; i++) {
                    let bbox = _rendered[i];
                    // let attribute = bbox.attr;
                    let attribute = this.getAttribute(i, bbox.attrInfo);

                    if (attribute) {
                        let minX = bbox.minX;
                        let maxX = bbox.maxX;
                        let minY = bbox.minY;
                        let maxY = bbox.maxY;
                        let tileWorldX = bbox.tileX;
                        let tileWorldY = bbox.tileY;
                        let halfWidth = (maxX - minX) * .5;
                        let halfHeight = (maxY - minY) * .5;
                        let screenX = screentile.x + minX - tileWorldX;
                        let screenY = screentile.y + minY - tileWorldY;

                        // center
                        screenX += halfWidth;
                        screenY += halfHeight;

                        let ac = display.project(screenX, screenY, 0, 0); // 0,0 for unscaled world pixels

                        // rendered.push([
                        //     ac[0] - halfWidth, // minX
                        //     ac[0] + halfWidth, // maxX
                        //     ac[1] - halfHeight, // minY
                        //     ac[1] + halfHeight, // maxY
                        //     collisions,
                        //     bbox.bos,
                        //     bbox.boe
                        // ]);

                        rendered.push({
                            minX: ac[0] - halfWidth, // minX
                            maxX: ac[0] + halfWidth, // maxX
                            minY: ac[1] - halfHeight, // minY
                            maxY: ac[1] + halfHeight, // maxY
                            bos: bbox.bos,
                            boe: bbox.boe,
                            // attrInfo: bbox.attrInfo
                            attr: attribute
                        });
                    }


                    // window.addPixelPoint(minX, minY, 'red', 5);
                    // window.addPixelPoint(maxX, minY, 'red', 5);
                    // window.addPixelPoint(maxX, maxY, 'red', 5);
                    // window.addPixelPoint(minX, maxY, 'red', 5);
                }
            }
        }


        let r = 0;
        while (r < rendered.length) {
            let bbox = rendered[r];
            // let attribute = this.getAttribute(r, bbox.attrInfo);

            let attribute = bbox.attr;

            // if(!attribute){
            //     r++;
            //     continue;
            // }


            let data = attribute.data;
            let start = bbox.bos;
            let stop = bbox.boe;

            if (this.intersects(bbox, rendered, ++r)) {
                // window.addPixelPoint(bbox[0] + .5 * (bbox[1] - bbox[0]), bbox[2] + .5 * (bbox[3] - bbox[2]), 'red');

                // is visible?
                if (data[start + 2] < 720) {
                    // console.log(collisions);
                    // hide all glyphs
                    while (start < stop) {
                        data[start + 2] += 720;
                        start += 3;
                    }
                    attribute.dirty = true;
                }
            } else {
                // is invisible ?
                if (data[start + 2] >= 720) {
                    // show all glyphs again..
                    while (start < stop) {
                        data[start + 2] -= 720;
                        start += 3;
                    }
                    attribute.dirty = true;
                }
            }

            // if(window._wtf){
            //     start = bbox[5];
            //     if (data[start + 2] >= 720) {
            //         // show all letters again..
            //         while (start < stop) {
            //             data[start + 2] -= 720;
            //             start += 3;
            //         }
            //         attribute.dirty = true;
            //     }
            // }
        }

        // console.timeEnd('update-collisions');
    }

    // _update() {
    //
    //     const tiles = this._t;
    //     console.time('update-collisions');
    //
    //     const {display} = this;
    //
    //     let rendered = [];
    //
    //     for (let screentile of tiles) {
    //         // let quadkey = screentile.tile.quadkey;
    //         let collisions = this.tiles.get(screentile.tile);
    //
    //         if (collisions && collisions.attr) {
    //             for (let bbox of collisions.rendered) {
    //                 let minX = bbox.minX;
    //                 let maxX = bbox.maxX;
    //                 let minY = bbox.minY;
    //                 let maxY = bbox.maxY;
    //                 let tileWorldX = bbox.tileX;
    //                 let tileWorldY = bbox.tileY;
    //
    //                 // let tileWorldX = bbox[4];
    //                 // let tileWorldY = bbox[5];
    //                 // let minX = bbox[0];
    //                 // let maxX = bbox[1];
    //                 // let minY = bbox[2];
    //                 // let maxY = bbox[3];
    //
    //                 let width = maxX - minX;
    //                 let height = maxY - minY;
    //
    //                 let screenX = screentile.x + minX - tileWorldX;
    //                 let screenY = screentile.y + minY - tileWorldY;
    //
    //
    //                 // center
    //                 screenX += width * .5;
    //                 screenY += height * .5;
    //
    //
    //                 let ac = display.project(screenX, screenY, 0, 0);
    //                 //
    //                 // // window.addPixelPoint(ac[0],ac[1],'red');
    //                 //
    //                 //
    //                 minX = ac[0] - width / 2;
    //                 minY = ac[1] - height / 2;
    //                 maxX = ac[0] + width / 2;
    //                 maxY = ac[1] + height / 2;
    //
    //                 // rendered.push({
    //                 //     minX: minX,
    //                 //     maxX: maxX,
    //                 //     minY: minY,
    //                 //     maxY: maxY,
    //                 // });
    //
    //                 rendered.push([minX, maxX, minY, maxY, collisions, bbox.bos, bbox.boe]);
    //                 // rendered.push([minX, maxX, minY, maxY, collisions, bbox[6], bbox[7]]);
    //
    //
    //                 window.addPixelPoint2(ac[0],ac[1]);
    //
    //                 window.addPixelPoint2(minX, minY);
    //                 window.addPixelPoint2(maxX, minY);
    //                 window.addPixelPoint2(maxX, maxY);
    //                 window.addPixelPoint2(minX, maxY);
    //
    //                 // // window.addPixelPoint(ac[0] - width / 2, ac[1] - height / 2, 'red');
    //                 // window.addPixelPoint(maxX,minY, 'red');
    //                 //
    //                 //
    //                 // // window.addPixelPoint(ac[0]+width,ac[1]+height,'red');
    //                 // // window.addPixelPoint(ac[0]+width/2,ac[1]+height/2,'red');
    //                 //
    //                 //
    //                 // // window.addPixelPoint(screenX,screenY,'red');
    //             }
    //             // console.log(collisions.rendered.length)
    //         }
    //     }
    //
    //     let r = 0;
    //     while (r < rendered.length) {
    //         let bbox = rendered[r];
    //         let collisions = bbox[4];
    //         let attribute = collisions.attr;
    //         let data = attribute.data;
    //         let start = bbox[5];
    //         let stop = bbox[6];
    //
    //         if (collides(bbox, rendered, ++r)) {
    //             // window.addPixelPoint(bbox[0] + .5 * (bbox[1] - bbox[0]), bbox[2] + .5 * (bbox[3] - bbox[2]), 'red');
    //
    //             // is visible?
    //             if (data[start + 2] < 720) {
    //                 // console.log(collisions);
    //                 // hide all glyphs
    //                 while (start < stop) {
    //                     data[start + 2] += 720;
    //                     start += 3;
    //                 }
    //                 attribute.dirty = true;
    //             }
    //         } else {
    //             // is invisible ?
    //             if (data[start + 2] >= 720) {
    //                 // show all glyphs again..
    //                 while (start < stop) {
    //                     data[start + 2] -= 720;
    //                     start += 3;
    //                 }
    //                 attribute.dirty = true;
    //             }
    //         }
    //
    //         // if(window._wtf){
    //         //     start = bbox[5];
    //         //     if (data[start + 2] >= 720) {
    //         //         // show all letters again..
    //         //         while (start < stop) {
    //         //             data[start + 2] -= 720;
    //         //             start += 3;
    //         //         }
    //         //         attribute.dirty = true;
    //         //     }
    //         // }
    //     }
    //
    //     console.timeEnd('update-collisions');
    // }
}