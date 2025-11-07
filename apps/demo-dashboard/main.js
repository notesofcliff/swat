import { SWAT } from '../../lib/swat.js';
import createTable from '../../lib/table-component.js';
import { createChartComponentForSWAT, LineChart, BarChart, PieChart } from '../../lib/canvas-charts.js';

const swat = new SWAT();
swat.registerComponent('table', createTable);
swat.registerComponent('linechart', createChartComponentForSWAT(LineChart));
swat.registerComponent('barchart', createChartComponentForSWAT(BarChart));
swat.registerComponent('piechart', createChartComponentForSWAT(PieChart));

const lineChartEl = swat.getComponent('linechart')({
  data: { labels: ['Jan', 'Feb', 'Mar'], datasets: [{ label: 'Sales', data: [10, 20, 30] }] }
});
document.getElementById('linechart').appendChild(lineChartEl);

const barChartEl = swat.getComponent('barchart')({
  data: { labels: ['Q1', 'Q2', 'Q3'], datasets: [{ label: 'Revenue', data: [100, 150, 200] }] }
});
document.getElementById('barchart').appendChild(barChartEl);

const pieChartEl = swat.getComponent('piechart')({
  data: { labels: ['A', 'B', 'C'], datasets: [{ data: [30, 50, 20] }] }
});
document.getElementById('piechart').appendChild(pieChartEl);

const tableEl = swat.getComponent('table')({
  columns: [{ key: 'name', label: 'Name' }, { key: 'value', label: 'Value' }],
  rows: [{ name: 'A', value: 1 }, { name: 'B', value: 2 }]
});
document.getElementById('table').appendChild(tableEl);