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
import chaiAlmost from 'chai-almost/index';
import dataset from './coordinates_convert_spec.json';

describe('converts coordinates between pixel and geo', function() {
    const expect = chai.expect;

    let display;

    before(async function() {
        chai.use(chaiAlmost(1e-4));
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.79802, latitude: 12.62214},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });

        await displayTests.waitForViewportReady(display);
    });

    after(async function() {
        display.destroy();
    });


    it('convert from pixel to geo coordinate', function() {
        expect(display.pixelToGeo(300, 300)).to.be.deep.almost({
            longitude: 77.79748355819703,
            latitude: 12.622140000000016
        });
    });

    it('convert from geo to pixel coordinate', function() {
        expect(display.geoToPixel(77.79802, 12.62214)).to.deep.equal({
            x: 400, y: 300
        });
    });

    it('convert from pixel to geo coordinate', async function() {
        await displayTests.waitForViewportReady(display, ()=>{
            display.setCenter({longitude: 77.80156588031764, latitude: 12.62374183549122});
        });

        expect(display.pixelToGeo(300, 300)).to.be.deep.almost({
            longitude: 77.80102943851466,
            latitude: 12.623741835491202
        });
    });

    it('convert from geo to pixel coordinate', async function() {
        display.setCenter({longitude: 77.80156588031764, latitude: 12.62374183549122});

        expect(display.geoToPixel(77.80102943851466, 12.62374183067114)).to.be.deep.almost({
            x: 300, y: 300.00092078372836
        });
    });
});
