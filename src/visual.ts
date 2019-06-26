/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";

import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import * as d3 from "d3";
import IColorPalette = powerbi.extensibility.IColorPalette;
import ISelectionId = powerbi.visuals.ISelectionId;
import { dataViewObjectsParser } from "powerbi-visuals-utils-dataviewutils";
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;
import DataViewObjects = powerbi.DataViewObjects;
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;

interface BarChartDataPoint {
    value: any;
    category: string;
    color?: string;
    strokeColor?: string;
    selectionId: ISelectionId;
};

/**
 * Interface for BarCharts viewmodel.
 *
 * @interface
 * @property {BarChartDataPoint[]} dataPoints - Set of data points the visual will render.
 * @property {number} dataMax                 - Maximum data value in the set of data points.
 */
interface BarChartViewModel {
    dataPoints: BarChartDataPoint[];
    dataMax: number;
    settings: VisualSettings;
};

class EnableAxis {
    show: boolean = true;
    fill: string = "#ccc";
};

class GeneralView {
    opacity: number = 100;
    showHelpLink: boolean = true;
    helpLinkColor: string = "";
};

class AverageLine {
    show: boolean = true;
    displayName: string = "";
    fill: string = "#ccc";
    showDataLabel: boolean = true;
};

export class VisualSettings extends DataViewObjectsParser {
    public enableAxis: EnableAxis = new EnableAxis();
    public generalView: GeneralView = new GeneralView();
    public averageLine: AverageLine = new AverageLine();
}


export class Visual implements IVisual {
    private settings: VisualSettings;
    private host: IVisualHost;
    private svg: d3.Selection<SVGElement, any, any, any>;
    private barContainer: d3.Selection<SVGElement, any, any, any>;
    private xAxis: d3.Selection<SVGElement, any, any, any>;
    private colorPalette: IColorPalette;
    private visualHost: IVisualHost;
    private barChartDataPoints: BarChartDataPoint[];
    private barSelection: d3.Selection<any, any, any, any>;


    private averageLine: d3.Selection<SVGElement, any, any, any>;
    private helpLinkElement: d3.Selection<any, any, any, any>;;

    static Config = {
        xScalePadding: 0.1,
        solidOpacity: 1,
        transparentOpacity: 0.4,
        margins: {
            top: 0,
            right: 0,
            bottom: 25,
            left: 0,
        },
        xAxisFontMultiplier: 0.04,
    };

    constructor(options: VisualConstructorOptions) {
        this.visualHost = options.host;
        console.log('Visual constructor', options);
        this.colorPalette = this.visualHost.colorPalette;
        this.svg = d3.select(options.element)
            .append('svg')
            .classed('barChart', true);


        this.barContainer = this.svg
            .append('g')
            .classed('barContainer', true);

        this.xAxis = this.svg
            .append('g')
            .classed('xAxis', true);


        this.initAverageLine();

        const helpLinkElement: Element = this.createHelpLinkElement();
        options.element.appendChild(helpLinkElement);

        this.helpLinkElement = d3.select(helpLinkElement);
    }

    private initAverageLine() {
        this.averageLine = this.svg
            .append('g')
            .classed('averageLine', true);

        this.averageLine.append('line')
            .attr('id', 'averageLine');

        this.averageLine.append('text')
            .attr('id', 'averageLineLabel');
    }

    private createHelpLinkElement(): Element {
        let linkElement = document.createElement("a");
        linkElement.textContent = "?";
        linkElement.setAttribute("title", "Open documentation");
        linkElement.setAttribute("class", "helpLink");
        linkElement.addEventListener("click", () => {
            this.host.launchUrl("https://microsoft.github.io/PowerBI-visuals/tutorials/building-bar-chart/adding-url-launcher-element-to-the-bar-chart/");
        });
        return linkElement;
    };

    public update(options: VisualUpdateOptions) {
        // this.clear();
        this.settings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);
        debugger;
        let viewModel: BarChartViewModel = this.parseVisualData(options);
        this.barChartDataPoints = viewModel.dataPoints;
        this.settings = viewModel.settings;


        let width: number = options.viewport.width;
        let height: number = options.viewport.height;

        console.log('Visual update', options);
        console.log("View model data: ");
        console.log(viewModel);

        this.svg.attr('width', width);
        this.svg.attr('height', height);


        if (this.settings.enableAxis.show) {
            let margins = Visual.Config.margins;
            height -= margins.bottom;
            //this.helpLinkElement.classList.add("hidden");
        }

        this.helpLinkElement
            .classed("hidden", !this.settings.generalView.showHelpLink)
            .style(
                "border-color", this.settings.generalView.helpLinkColor
            )
            .style("color", this.settings.generalView.helpLinkColor);

        this.xAxis.style(
            'font-size', d3.min([height, width]) * Visual.Config.xAxisFontMultiplier,
        )
        .style("fill", this.settings.enableAxis.fill,);

        let yScale = d3.scaleLinear()
            .domain([0, viewModel.dataMax])
            .range([height, 0]);

        let xScale = d3.scaleBand()
            .domain(viewModel.dataPoints.map(d => d.category))
            .rangeRound([0, width]);

        let xAxis = d3.axisBottom(xScale);

        this.xAxis.attr('transform', 'translate(0, ' + height + ')')
        .call(xAxis);

        this.barSelection = this.barContainer
            .selectAll('.bar');

        let barSelectionWithData = this.barSelection.data(this.barChartDataPoints);

        barSelectionWithData
            .enter()
            .append('rect')
            .classed('bar', true);

        this.barSelection = this.barContainer
            .selectAll('.bar');

        this.barSelection
            .attr('width', xScale.bandwidth())
            .attr('height', d => height - yScale(<number>d.value))
            .attr('y', d => yScale(<number>d.value))
            .attr('x', d => xScale(d.category))
            .attr('fill', d => d.color)
            .style('fill-opacity', viewModel.settings.generalView.opacity / 100);
    }

    private parseVisualData(options: VisualUpdateOptions): BarChartViewModel {
        let dataViews = options.dataViews;
        let viewModel: BarChartViewModel = {
            dataPoints: [],
            dataMax: 0,
            settings: this.settings
        };

        if (!dataViews
            || !dataViews[0]
            || !dataViews[0].categorical
            || !dataViews[0].categorical.categories
            || !dataViews[0].categorical.categories[0].source
            || !dataViews[0].categorical.values
        ) {
            return viewModel;
        }

        let barChartDataPoints: BarChartDataPoint[] = [];
        let categorical = dataViews[0].categorical;
        let category = categorical.categories[0];
        let dataValue = categorical.values[0];
        let colorPalette: ISandboxExtendedColorPalette = this.visualHost.colorPalette;
        const strokeColor: string = this.getColumnStrokeColor(colorPalette);

        for (let i = 0, len = Math.max(category.values.length, dataValue.values.length); i < len; i++) {
            let cat: string = `${category.values[i]}`;
            let color: string = this.colorPalette.getColor(cat).value;
            const selectionId: ISelectionId = this.visualHost.createSelectionIdBuilder()
                .withCategory(category, i)
                .createSelectionId();

            barChartDataPoints.push({
                value: dataValue.values[i],
                category: cat,
                color: color,
                strokeColor: strokeColor,
                selectionId: selectionId
            });
        }

        return {
            dataPoints: barChartDataPoints,
            dataMax: 100,
            settings: this.settings
        };
    }

    private static parseSettings(dataView: DataView): VisualSettings {
        const settings: VisualSettings = VisualSettings.parse<VisualSettings>(dataView);
        return settings;
    }

    /**
     * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
     * objects and properties you want to expose to the users in the property pane.
     *
     */
    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        let objectName = options.objectName;
        let objectEnumeration: VisualObjectInstance[] = [];

        switch (objectName) {
            case 'enableAxis':
                objectEnumeration.push({
                    objectName: objectName,
                    properties: {
                        show: this.settings.enableAxis.show,
                        fill: this.settings.enableAxis.fill,
                    },
                    selector: null
                });
                break;
            case 'generalView':
                objectEnumeration.push({
                    objectName: objectName,
                    properties: {
                        opacity: this.settings.generalView.opacity,
                        showHelpLink: this.settings.generalView.showHelpLink
                    },
                    validValues: {
                        opacity: {
                            numberRange: {
                                min: 10,
                                max: 100
                            }
                        }
                    },
                    selector: null
                });
                break;
            case 'averageLine':
                objectEnumeration.push({
                    objectName: objectName,
                    properties: {
                        show: this.settings.averageLine.show,
                        displayName: this.settings.averageLine.displayName,
                        fill: this.settings.averageLine.fill,
                        showDataLabel: this.settings.averageLine.showDataLabel
                    },
                    selector: null
                });
                break;
            case 'colorSelector':
                for (let barDataPoint of this.barChartDataPoints) {
                    objectEnumeration.push({
                        objectName: objectName,
                        displayName: barDataPoint.category,
                        properties: {
                            fill: {
                                solid: {
                                    color: barDataPoint.color
                                }
                            }
                        },
                        selector: null
                    });
                }
                break;
        }


        return objectEnumeration;
    }




    private getColumnStrokeColor(colorPalette: ISandboxExtendedColorPalette): string {
        return colorPalette.isHighContrast
            ? colorPalette.foreground.value
            : null;
    }
}