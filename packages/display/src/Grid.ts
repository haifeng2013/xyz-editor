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

import {tile, projection, geo} from '@here/xyz-maps-core';
import {rotate} from './geometry';

const tileUtils = tile.Utils;
const INFINITY = Infinity;
const prj = projection.webMercator;

type GridView = {
    x: number,
    y: number,
    tiles: string[][]
}

class Grid {
    x: number;
    y: number;

    private minLon: number;
    private maxLon: number;
    private minLat: number;
    private maxLat: number;

    private boundsMinLon: number;
    private boundsMaxLat: number;

    private size: number; // tile size
    // private scale: number;
    constructor(tileSize: number) {
        // let scale = tileSize / 256;
        // // scale     = Math.pow(4,scale-1);
        // this.scale = scale == 2 ? 0.25 : 0;

        this.size = tileSize;
    }

    init(bounds: geo.Rect, rotZRad: number, width?: number, height?: number) {
        // configure projection zoomlevel..
        let worldSize = 1;

        const boundsMinLon = bounds.minLon;
        const boundsMaxLon = bounds.maxLon;
        const boundsMinLat = bounds.minLat;
        const boundsMaxLat = bounds.maxLat;

        let deltaLon = boundsMaxLon - boundsMinLon;
        let deltaLat = boundsMaxLat - boundsMinLat;
        const centerLon = boundsMinLon + .5 * deltaLon;
        const centerLat = boundsMinLat + .5 * deltaLat;
        let centerX = prj.lon2x(centerLon, worldSize);
        let centerY = prj.lat2y(centerLat, worldSize);


        let minLon = INFINITY;
        let minLat = INFINITY;
        let maxLon = -INFINITY;
        let maxLat = -INFINITY;

        // const scale = this.scale;
        // deltaLon *= scale;
        // deltaLat *= scale;

        const rotateCenter = (lon, lat) => {
            let rotated = rotate(
                prj.lon2x(lon, worldSize),
                prj.lat2y(lat, worldSize),
                centerX,
                centerY,
                rotZRad
            );
            return [
                prj.x2lon(rotated[0], worldSize),
                prj.y2lat(rotated[1], worldSize)
            ];
        };

        for (let c of [
            rotateCenter(boundsMinLon/* + deltaLon*/, boundsMaxLat/* - deltaLat*/),
            rotateCenter(boundsMaxLon/* - deltaLon*/, boundsMaxLat/* - deltaLat*/),
            rotateCenter(boundsMinLon/* + deltaLon*/, boundsMinLat/* + deltaLat*/),
            rotateCenter(boundsMaxLon/* - deltaLon*/, boundsMinLat/* + deltaLat*/)
        ]) {
            if (c[0] < minLon) minLon = c[0];
            if (c[0] > maxLon) maxLon = c[0];
            if (c[1] < minLat) minLat = c[1];
            if (c[1] > maxLat) maxLat = c[1];
        }

        this.minLon = minLon;
        this.maxLon = maxLon;
        this.minLat = minLat;
        this.maxLat = maxLat;

        this.boundsMinLon = boundsMinLon;
        this.boundsMaxLat = boundsMaxLat;
        // this.deltaLon = deltaLon;
        // this.deltaLat = deltaLat;
    };


    getGrid(zoomLevel: number, tileSize: number = this.size): GridView {
        let grid = [];
        const minLon = this.minLon;
        const maxLon = this.maxLon;
        const minLat = this.minLat;
        const maxLat = this.maxLat;
        const boundsMinLon = this.boundsMinLon; // + this.deltaLon;
        const boundsMaxLat = this.boundsMaxLat; // - this.deltaLat;


        // const tileSize = this.size;
        // configure projection zoomlevel..
        const worldSize = tileSize << zoomLevel;

        let topLeftLRC = tileUtils.geoToGrid(minLon, maxLat, zoomLevel);
        let bottomRigthLRC = tileUtils.geoToGrid(maxLon, minLat, zoomLevel);
        let gridX = bottomRigthLRC[2] - topLeftLRC[2] + 1;
        let gridY = bottomRigthLRC[1] - topLeftLRC[1] + 1;

        let tileTopLeftPixelX = topLeftLRC[2] * tileSize;
        let tileTopLeftPixelY = topLeftLRC[1] * tileSize;
        let vpTopleftX = prj.lon2x(boundsMinLon, worldSize);
        let vpTopleftY = prj.lat2y(boundsMaxLat, worldSize);

        let vpTiles = tileUtils.getTilesIds(topLeftLRC, bottomRigthLRC);

        for (let x = 0, i = 0; x < gridY; x++) {
            grid[x] = [];
            for (let y = 0; y < gridX; y++) {
                grid[x][y] = vpTiles[i++];
            }
        }

        return {
            x: tileTopLeftPixelX - vpTopleftX,
            y: tileTopLeftPixelY - vpTopleftY,
            tiles: grid
        };
    }

    // forEachTile(zoomLevel: number, callback: (quadkey: string) => void, tileSize: number = this.size) {
    //
    // }
}


export default Grid;


