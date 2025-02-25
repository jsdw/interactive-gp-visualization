<!-- Copyright (c) 2021 ST John -->
<script>
  import { onMount } from "svelte";
  import { scaleLinear, scaleOrdinal } from "d3-scale";
  import { schemeCategory10 } from "d3-scale-chromatic";
  import { zip } from "d3-array";
  import { x1, x2, y1, y2 } from "./store.js";
  import { getSVGpoint } from "./getsvgpoint.js";
  import { linspace, gaussian } from "./mymath.js";
  import { pathGenerator, offset } from "./myplot.js";
  import Axes from "./Axes.svelte";
  import XIndicators from "./XIndicators.svelte";
  import YIndicatorBar from "./YIndicatorBar.svelte";
  export let xs, means, marginalVariances, samples, points, atX1, atX2;

  let svg;
  let width = 500;
  let height = 200;

  const padding = { top: 20, right: 40, bottom: 40, left: 25 };

  $: xTicks = [0, 1, 2, 3, 4, 5, 6];

  $: yTicks = height > 180 ? [-3, -2, -1, 0, 1, 2, 3] : [-3, 0, 3];

  $: xScale = scaleLinear()
    .domain([minX, maxX])
    .range([padding.left, width - padding.right]);

  $: yScale = scaleLinear()
    .domain([minY, maxY])
    .range([height - padding.bottom, padding.top]);

  $: minX = 0; // xs[0];
  $: maxX = 6; // xs[xs.length - 1];
  $: minY = Math.min.apply(null, yTicks);
  $: maxY = Math.max.apply(null, yTicks);

  $: makePath = pathGenerator(xScale, yScale);

  // mean and samples
  $: pathMean = makePath(xs, means);
  $: samplePaths = samples
    .transpose()
    .to2DArray()
    .map((ys) => makePath(xs, ys));

  // marginal y distributions at x1 and x2
  // TODO unify with Covariance?
  let num_grid = 60;
  $: ys = linspace(minY, maxY, num_grid);
  $: marginalDistX1 = gaussian(atX1.mean, atX1.variance);
  $: marginalDistX2 = gaussian(atX2.mean, atX2.variance);
  $: pathMarginal1 = makePath(ys.map(offset($x1, marginalDistX1)), ys);
  $: pathMarginal2 = makePath(ys.map(offset($x2, marginalDistX2)), ys);

  // one and two sigma confidence intervals
  $: sigma = marginalVariances.map((v) => Math.sqrt(v));
  $: confidenceLower2 = means.map((mean, idx) => mean - 2 * sigma[idx]);
  $: confidenceLower1 = means.map((mean, idx) => mean - sigma[idx]);
  $: confidenceUpper1 = means.map((mean, idx) => mean + sigma[idx]);
  $: confidenceUpper2 = means.map((mean, idx) => mean + 2 * sigma[idx]);
  $: makeArea = (lower, upper) =>
    `${makePath(xs, lower)}L${makePath(xs, upper, true).slice(1)}Z`;
  $: areaConfidence1 = makeArea(confidenceLower1, confidenceUpper1);
  $: areaConfidence2 = makeArea(confidenceLower2, confidenceUpper2);

  // event handlers
  onMount(resize);
  function resize() {
    ({ width, height } = svg.getBoundingClientRect());
  }

  function addPoint(newX, newY) {
    points = points.concat({ x: newX, y: newY });
  }
  function removePoint(point, event) {
    event.stopPropagation();
    points = points.filter((element) => element != point);
  }

  function handleClick(event) {
    const pt = getSVGpoint(svg, event);
    const newX = xScale.invert(pt.x);
    const newY = yScale.invert(pt.y);
    if (event.shiftKey) {
      x1.set(newX);
    } else {
      addPoint(newX, newY);
    }
  }
  function handleMousemove(event) {
    const pt = getSVGpoint(svg, event);
    const newX = xScale.invert(pt.x);
    const newY = yScale.invert(pt.y);
    if (event.shiftKey) {
      x1.set(newX);
    } else {
      x2.set(newX);
    }
    y1.set(newY);
    y2.set(newY);
  }

  // TODO unify with Covariance.svelte?
  const sampleColor = scaleOrdinal(schemeCategory10);
</script>

<svelte:window on:resize={resize} />

<svg bind:this={svg} on:mousemove={handleMousemove} on:click={handleClick}>
  <Axes {xScale} {yScale} {xTicks} {yTicks} {width} {height} {padding} />
  <XIndicators {xScale} {yScale} y1={minY} y2={maxY} />
  <YIndicatorBar {xScale} {yScale} />

  <!-- data -->
  <path class="path-area" d={areaConfidence2} />
  <path class="path-area" d={areaConfidence1} />
  <path class="path-line" d={pathMean} />
  <path
    class="path-line"
    d={pathMarginal1}
    style="stroke: red; stroke-width: 2;"
  />
  <path
    class="path-line"
    d={pathMarginal2}
    style="stroke: orange; stroke-width: 2;"
  />

  {#each samplePaths as path, i}
    <path class="path-line" d={path} style="stroke: {sampleColor(i)};" />
  {/each}

  {#each atX1.ys as y1, i}
    <circle
      cx={xScale($x1)}
      cy={yScale(y1)}
      r="3"
      style="fill: {sampleColor(i)};"
    />
  {/each}
  {#each atX2.ys as y2, i}
    <circle
      cx={xScale($x2)}
      cy={yScale(y2)}
      r="3"
      style="fill: {sampleColor(i)};"
    />
  {/each}

  {#each points as point}
    <circle
      cx={xScale(point.x)}
      cy={yScale(point.y)}
      r="5"
      on:click={(event) => removePoint(point, event)}
    />
    <!-- see https://svelte.dev/examples#7guis-circles -->
  {/each}
</svg>

<style>
  svg {
    width: 100%;
    height: 100%;
  }

  circle {
    fill: black;
    fill-opacity: 0.6;
    stroke: rgba(0, 0, 0, 0.5);
  }

  .path-line {
    fill: none;
    stroke: rgb(0, 100, 100);
    stroke-linejoin: round;
    stroke-linecap: round;
    stroke-width: 2;
  }

  .path-area {
    fill: rgba(0, 100, 100, 0.2);
  }
</style>
