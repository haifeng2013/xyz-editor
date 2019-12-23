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
import {displayTests, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import chai from 'chai/chai';
import dataset from './pan_map_spec.json';

describe('pan the map', function() {
    const expect = chai.expect;

    let display;

    before(async function() {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.99026323253071, latitude: 12.135767132480497},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
    });

    after(async function() {
        display.destroy();
    });

    it('validate map center', async function() {
        expect(display.getCenter()).to.deep.equal({longitude: 77.99026323253071, latitude: 12.135767132480497});
    });

    it('pan the map and validate', async function() {
        await displayTests.waitForViewportReady(display, ()=>{
            display.pan(100, 100, 0, 0);
        });

        expect(display.getCenter()).to.deep.equal({latitude: 12.136291585468356, longitude: 77.98972679072773});
        expect(display.getHeight()).to.equal(600);
        expect(display.getWidth()).to.equal(800);
        expect(display.getViewBounds()).to.deep.equal({
            minLon: 77.98758102351582,
            minLat: 12.134718223407958,
            maxLon: 77.99187255793964,
            maxLat: 12.137864938237826
        });
        expect(display.getZoomlevel()).to.equal(18);
    });
});
