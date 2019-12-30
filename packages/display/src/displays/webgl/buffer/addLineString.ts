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

type Cap = 'round' | 'butt' | 'square';
type Join = 'round' | 'bevel' | 'miter' | 'none';

const CAP_SQUARE = 'square';
const JOIN_MITER = 'miter';
const JOIN_BEVEL = 'bevel';

// const SCALE = 1;
const SCALE = 8192;


const normalize = (p) => {
    let x = p[0];
    let y = p[1];
    let len = x * x + y * y;
    if (len > 0) {
        len = 1 / Math.sqrt(len);
        // len = 127 / Math.sqrt(len);
        // len = SCALE / Math.sqrt(len);
        // len = 32767 / Math.sqrt(len);
        p[0] = x * len;
        p[1] = y * len;
    }
    return p;
};


const addCap = (cap: Cap, x: number, y: number, nx: number, ny: number, vertex: number[], normal: number[]) => {
    if (cap == 'round') {
        vertex.push(
            x, y,
            x, y,
            x, y
        );

        nx *= Math.SQRT2;
        ny *= Math.SQRT2;

        normal.push(
            -nx, ny, -nx, ny, // p1.1
            nx, -ny, nx, -ny, // p1.2
            ny, nx, ny, nx // p1.0
        );
    } else if (cap == CAP_SQUARE) {
        // -----------
        // | \       |
        // |   \     |
        // |     \   |
        // |       \ |
        // -----------
        vertex.push(
            x, y,
            x, y,
            x, y,

            x, y,
            x, y,
            x, y
        );

        let sqNx = ny - nx;
        let sqNy = nx + ny;

        normal.push(
            -nx, ny, 0, 0, // p1.2
            sqNy, -sqNx, 0, 0, // p1.0
            nx, -ny, 0, 0, // p1.1

            sqNx, sqNy, nx, ny, // p1.0
            sqNy, -sqNx, nx, ny, // p1.0
            -nx, ny, 0, 0, // p1.2
        );
    }
};


const addLineString = (vertex: number[], normal: number[], coordinates: [number, number, number?][], tile, tileSize: number, cap: Cap, join: Join, strokeWidth?: number, lengthSoFar?: number[]) => {
    // console.time('LSV');
    const vLength = coordinates.length;
    let x1 = tile.lon2x(coordinates[0][0], tileSize);
    let y1 = tile.lat2y(coordinates[0][1], tileSize);
    let totalLength = 0;
    let segments = 0;
    let prevNUp;
    let prevNDown;
    let length;
    let curJoin;
    let x2;
    let y2;
    let dx;
    let dy;
    let nx;
    let ny;

    if (lengthSoFar) {
        cap = 'butt';
        join = 'none';
    }

    let x3 = null;
    let y3 = null;
    let ex;
    let ey;
    let prevEx;
    let prevEy;
    let prevP2Up;
    let prevP2Down;

    let nUp;
    let p1Up;
    let p2Up;
    let nDown;
    let p1Down;
    let p2Down;

    let prevBisectorExceeds;
    let prevBisectorLength = 0;
    let prevLeft;
    let prevJoin;

    let first = null;

    for (let c = 1; c < vLength; c++) {
        x2 = x3 == null ? tile.lon2x(coordinates[c][0], tileSize) : x3;
        y2 = y3 == null ? tile.lat2y(coordinates[c][1], tileSize) : y3;
        dx = x1 - x2;
        dy = y1 - y2;

        if (!dx && !dy) {
            x2 = null;
            x3 = null;
            continue;
        }


        let last = c == vLength - 1;

        first = first == null ? true : false;
        curJoin = join;
        length = Math.sqrt(dx * dx + dy * dy);
        // length so far including current segment
        length += totalLength;

        if (lengthSoFar) {
            lengthSoFar.push(
                totalLength, length, totalLength,
                length, length, totalLength
            );
        }


        //          p1.1                        p2.1
        //         / *---------------------------* \
        //       /   ^             ^             |   \
        //      /    |n1           |n            |     \
        //     /     |             |             |      \
        // p1.0 --- p1 ------------------------- p2 --- p2.0
        //     \     |                           |     /
        //      \    |n2                         |    /
        //       \   v                           |   /
        //         \ *---------------------------* /
        //          p1.2                        p2.2


        let n = normalize([dx, dy]);
        // let n = normalize2([], [dx, dy]);
        nx = n[1];
        ny = n[0];


        let left;
        let nextDx = null;
        let nextDy = null;
        let nextNormal = null;
        let nextNx = null;
        let nextNy = null;
        let next = null;
        let nextNUp;
        let nextNDown;

        let bisectorExceeds = false;
        let bisectorLength;

        if (!last) {
            x3 = tile.lon2x(coordinates[c + 1][0], tileSize);
            y3 = tile.lat2y(coordinates[c + 1][1], tileSize);

            nextDx = x2 - x3;
            nextDy = y2 - y3;
            next = [nextDx, nextDy];
            nextNormal = normalize(next.slice());
            // nextNormal = normalize2([], next);
            nextNx = nextNormal[1];
            nextNy = nextNormal[0];
            nextNUp = [-nextNx * SCALE, nextNy * SCALE];
            nextNDown = [-nextNUp[0], -nextNUp[1]];

            ex = nextNx + nx;
            ey = -nextNy - ny;

            left = dx * nextDy - dy * nextDx < 0;
            // left = -nx * nextDx + ny * nextDy <0;
        }
        const bisector = [ex, ey];
        // dot product
        bisectorLength = 1 / (bisector[0] * nx - bisector[1] * ny);

        // if angle is to sharp and bisector length goes to infinity we cut the cone
        // bisectorLength > 10 behaves exactly like canvas2d..
        // ..but we cut earlier to prevent "cone explosion"
        if (join == JOIN_MITER) {
            if (bisectorLength > 2) {
                curJoin = JOIN_BEVEL;
            }
            if (prevBisectorLength > 2) {
                prevJoin = JOIN_BEVEL;
            }
        }

        // if(c==2)debugger;

        ex = bisector[0] * bisectorLength;
        ey = bisector[1] * bisectorLength;

        // >2 -> >90deg
        let b = Math.sqrt(ex * ex + ey * ey) / 2;
        bisectorExceeds = b > 1;

        if (bisectorExceeds) {
            ex /= b;
            ey /= b;
        }

        nx *= SCALE;
        ny *= SCALE;
        ex *= SCALE;
        ey *= SCALE;

        nUp = [-nx, ny];
        nDown = [nx, -ny];

        p1Down = nDown;
        p2Down = nDown;
        p1Up = nUp;
        p2Up = nUp;

        if (join != 'none') {
            if (!last && curJoin == JOIN_MITER) {
                if (left) {
                    p2Up = [-ex, -ey];
                    p2Down = [ex, ey];
                } else {
                    p2Up = [-ex, -ey];
                    p2Down = [ex, ey];
                }
            }

            if (!first && !prevBisectorExceeds) {
                if (!prevLeft) {
                    p1Down = [prevEx, prevEy];
                    if (join == 'miter') {
                        p1Up = [-prevEx, -prevEy]; // miter
                    }
                } else {
                    p1Up = [-prevEx, -prevEy];
                    if (join == 'miter') {
                        p1Down = [prevEx, prevEy]; // miter
                    }
                }
            }


            if (!bisectorExceeds) {
                if (join != JOIN_MITER) {
                    if (!last) {
                        if (left) {
                            p2Up = [-ex, -ey];
                        } else {
                            p2Down = [ex, ey];
                        }
                    }
                }
            }
        }

        normal.push(
            // 1down -> 2down -> 1up
            //
            // 1
            // | >.
            // 1  2
            p1Down[0], p1Down[1], nDown[0], nDown[1],
            p2Down[0], p2Down[1], nDown[0], nDown[1],
            p1Up[0], p1Up[1], nUp[0], nUp[1],

            // 2down -> 2up -> 1up
            //
            // 1  2
            // °< |
            //    2
            p2Down[0], p2Down[1], nDown[0], nDown[1],
            p2Up[0], p2Up[1], nUp[0], nUp[1],
            p1Up[0], p1Up[1], nUp[0], nUp[1]
        );
        // add vertex data
        vertex.push(
            x1, y1,
            x2, y2,
            x1, y1,
            x2, y2,
            x2, y2,
            x1, y1
        );


        if (!first && join != 'none') {
            if (join == 'round') {
                // Cone
                //   3
                //  / \
                // 1---2
                if (prevLeft) {
                    normal.push(
                        prevNDown[0], prevNDown[1], prevNDown[0], prevNDown[1],
                        p1Down[0], p1Down[1], p1Down[0], p1Down[1],
                        prevEx, prevEy, prevEx, prevEy
                    );
                } else {
                    normal.push(
                        prevNUp[0], prevNUp[1], prevNUp[0], prevNUp[1],
                        p1Up[0], p1Up[1], nUp[0], nUp[1],
                        -prevEx, -prevEy, -prevEx, -prevEy
                    );
                }
                vertex.push(
                    x1, y1,
                    x1, y1,
                    x1, y1
                );
            }


            if (!prevBisectorExceeds) {
                if (join != JOIN_MITER) {
                    let an = normalize([ex, ey]); // alias normal
                    an[0] *= SCALE;
                    an[1] *= SCALE;
                    // 1---3
                    //  \ /
                    //   2
                    if (prevLeft) {
                        if (join == JOIN_BEVEL) {
                            // allow antialias for bevel join
                            normal.push(
                                prevNDown[0], prevNDown[1], an[0], an[1],
                                p1Up[0], p1Up[1], -an[0], -an[1],
                                p1Down[0], p1Down[1], an[0], an[1]
                            );
                        } else {
                            normal.push(
                                prevNDown[0], prevNDown[1], prevNDown[0], prevNDown[1],
                                p1Up[0], p1Up[1], -an[0], -an[1],
                                p1Down[0], p1Down[1], p1Down[0], p1Down[1]
                            );
                        }
                    } else {
                        if (join == JOIN_BEVEL) {
                            // allow antialias for bevel join
                            normal.push(
                                prevNUp[0], prevNUp[1], -an[0], -an[1],
                                p1Down[0], p1Down[1], an[0], an[1],
                                p1Up[0], p1Up[1], -an[0], -an[1],
                            );
                        } else {
                            normal.push(
                                prevNUp[0], prevNUp[1], prevNUp[0], prevNUp[1],
                                p1Down[0], p1Down[1], an[0], an[1],
                                p1Up[0], p1Up[1], nUp[0], nUp[1],
                            );
                        }
                    }
                    vertex.push(
                        x1, y1,
                        x1, y1,
                        x1, y1
                    );
                }
            } else {
                if (!first) {
                    // alias normal: no alias for round joins
                    let anX = 0;
                    let anY = 0;
                    if (join != 'round') {
                        let an = normalize([ex, ey]);
                        anX = an[0] * SCALE;
                        anY = an[1] * SCALE;
                    }
                    vertex.push(x1, y1, x1, y1, x1, y1);

                    if (prevLeft) {
                        normal.push(
                            0, 0, 0, 0,
                            prevNDown[0], prevNDown[1], anX, anY,
                            nDown[0], nDown[1], anX, anY
                        );
                    } else {
                        normal.push(
                            0, 0, 0, 0,
                            prevNUp[0], prevNUp[1], anX, anY,
                            nUp[0], nUp[1], anX, anY
                        );
                    }
                }
                //
            }
        }

        if (first) {
            addCap(cap, x1, y1, nx, ny, vertex, normal);
        }

        if (last) {
            addCap(cap, x2, y2, -nx, -ny, vertex, normal);
        }

        prevNUp = nUp;
        prevNDown = nDown;
        prevP2Up = p2Up;
        prevP2Down = p2Down;

        prevEx = ex;
        prevEy = ey;

        x1 = x2;
        y1 = y2;

        prevLeft = left;
        prevBisectorExceeds = bisectorExceeds;
        prevBisectorLength = bisectorLength;
        prevJoin = curJoin;
        totalLength = length;
    }
    // console.timeEnd('LSV');

    return segments;
};

export {addLineString, normalize};
