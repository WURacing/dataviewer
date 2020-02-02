import React, { Component } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceArea } from 'recharts';
import { timeString, PREC, createSpreadsheet, leftPad } from './util';
import './Chart.css';
import { filterData, math, calculateFilterValue } from './filters';
import { fft, util } from "fft-js";

const colors = ["red", "blue", "green", "purple", "orange", "gray", "gold", "indigo", "navy", "darkslategray"];
function getColor(i) {
	if (i > 10) {
		return "#000000";
	} else {
		return colors[i];
	}
}
const defaultRight = "dataMax";
const defaultLeft = "dataMin";

export class ChartModal extends Component {
	constructor(props) {
		super(props);
		this.state = this.update({ zoom: { left: defaultLeft, right: defaultRight } }, props);
	}

	componentDidMount() {
	}

	componentDidUpdate(oldprops) {
		if (this.props.filters.length !== oldprops.filters.length)
			this.setState((state, props) => this.update(state, props));
	}

	update(state, props) {
		state.filters = props.filters.slice();
		// Fake continuity (probably needs a better solution like averaging, but this is O(n))
		let prev = {};
		state.data = [];
		for (let dp of props.data) {
			let n = {};
			Object.assign(prev, dp);
			Object.assign(n, prev);
			state.data.push(n);
		}		
		// Load filters and calculate the LCs
		try {
			state.data = filterData(state.data, props.filters);
		} catch (error) {
			alert(`Filtering data failed! One of your filters probably has a syntax error! Please fix it, or complain to Connor! \n Error: ${error}`);
			state.data = [];
		}
		state.title = props.filters.reduce((accum, filter, index) => {
			let s = accum + filter.name + (filter.units ? ` (${filter.units})` : "");
			if (index < props.filters.length - 1) {
				return s + " and ";
			} else {
				return s;
			}
		}, "");
		let time = "";
		if (state.data.length > 0) {
			let start = new Date(state.data[0].time);
			let end = new Date(state.data[state.data.length-1].time);
			time += leftPad(start.getFullYear(), 4) + "-" + leftPad(start.getMonth()+1, 2) + "-" +
				leftPad(start.getDate(), 2);
			time += "_";
			time += leftPad(start.getHours(), 2) + "-" + leftPad(start.getMinutes(), 2);
			time += "_";
			time += leftPad(end.getHours(), 2) + "-" + leftPad(end.getMinutes(), 2);
		}
		state.filename = "DATA_" + time + "_" + props.filters.map(filter => filter.name).join("-") + ".csv";



		const shouldZoom = Number.isInteger(state.zoom.left) && Number.isInteger(state.zoom.right);


		// If no data points, we're done here
		if (state.data.length < 2) return state;


		// Simplify the line by pruning points. TODO use Ramer-Douglas-Peucker or some better alg.
		const maxPoints = 250;
		// unit of time between points to keep
		let timeskip = (state.data[state.data.length - 1].time - state.data[0].time) / maxPoints;
		let timeskipZ;
		// keep equal amount of points inside the zoom window
		if (shouldZoom) {
			timeskipZ = (state.zoom.right - state.zoom.left) / maxPoints
		}

		if (state.data.length > maxPoints) {
			let ltime = 0;
			state.data = state.data.filter(d => {
				const dtime = d.time - ltime;
				if (dtime > timeskip) {
					ltime = d.time;
					return true;
				}
				if (shouldZoom && d.time >= state.zoom.left && d.time <= state.zoom.right && dtime > timeskipZ) {
					ltime = d.time;
					return true;
				}
				return false;
			});
		}
		// remove imaginary components
		let imaginary = false;
		for (let dp of state.data) {
			for (let key of Object.keys(dp)) {
				let val = dp[key];
				if (math.im(val) !== 0) {
					if (!imaginary) {
						imaginary = true;
						alert(`${key} contains complex numbers with nonzero imaginary components! We can't plot these! The plot will only be showing the real components! Please download the spreadsheet to see the true values, or fix the domain errors in your filter!`);	
					}
					dp[key] = math.re(val);
				}
			}
		}
		return state;
	}

	nextLabelUpdate = 0;
	leftLabel = null;
	rightLabel = null;

	// start making a selection
	graphStartSelect(e) {
		if (e && e.activeLabel) {
			this.setState({ leftLabel: e.activeLabel, rightLabel: defaultRight })
			this.leftLabel = e.activeLabel;
		}
	}

	// update right endpoint fo selection
	graphMoveSelect(e) {
		if (e && e.activeLabel && this.leftLabel) {
			// only update the reference region occasionally or there will be unbearable lag
			let now = new Date().getTime();
			if (now > this.nextLabelUpdate) {
				this.nextLabelUpdate = now + 30;
				this.setState({ rightLabel: e.activeLabel })
			}
			this.rightLabel = e.activeLabel;
		}
	}

	// zoom in
	graphEndSelect() {
		this.setState((state, props) => {
			let left = this.leftLabel;
			let right = this.rightLabel;
			if (!left || !right) {
				left = defaultLeft;
				right = defaultRight;
			} else if (right < left) {
				let tmp = left;
				left = right;
				right = tmp;
			}
			this.leftLabel = state.leftLabel = null;
			this.rightLabel = state.rightLabel = null;
			state.zoom = { left, right };
			return this.update(state, props);
		})
	}

	zoomOut() {
		this.setState((state, props) => {
			state.zoom = { left: defaultLeft, right: defaultRight };
			return this.update(state, props);
		})
	}

	runFFT() {
		if (this.props.filters.length !== 1) {
			alert("Please have only one data point.");
			return;
		}
		let data = calculateFilterValue(this.props.filters[0], this.props.data);
		let size = 1;
		while (data.length >= size) {
			size *= 2;
		}
		size /= 2;
		while (data.length > size) {
			data.pop();
		}
		// let time = this.props.data[this.props.data.length - 1].time;
		// while (data.length < size) {
		// 	let db = { time: time++};
		// 	db[this.props.filters[0].name] = 0;
		// 	data.push(db);
		// }

		console.log(data.length);

		let datavec = data.map(dp => dp[this.props.filters[0].name]);

		console.log(datavec);

		let phasors = fft(datavec);

		let ts = parseInt(data[data.length - 1].time) - parseInt(data[0].time);
		ts = (data.length / (ts / 1000));

		console.log(ts);
		console.log(phasors)

		var frequencies = util.fftFreq(phasors, ts),
			magnitudes = util.fftMag(phasors); 

		var both = frequencies.map(function (f, ix) {
			return {frequency: f, magnitude: magnitudes[ix]};
		});

		this.setState({ fourier: true, frequencies: both });

	}

	render() {
		const shouldZoom = Number.isInteger(this.state.zoom.left) && Number.isInteger(this.state.zoom.right);

		return (
			<Modal show={true} onHide={this.props.onClose} size="lg">
				<Modal.Header closeButton>
					<Modal.Title>Plot of {this.state.title}</Modal.Title>
				</Modal.Header>

				<Modal.Body>
					<ResponsiveContainer width="100%" height={500}>
						<LineChart
							data={this.state.fourier && this.state.frequencies || this.state.data}
							margin={{
								top: 30, right: 80, left: 30, bottom: 10,
							}}
							onMouseDown={this.graphStartSelect.bind(this)}
							onMouseMove={this.graphMoveSelect.bind(this)}
							onMouseUp={this.graphEndSelect.bind(this)}
						>
							<CartesianGrid strokeDasharray="3 3" />
							{this.state.fourier &&
							<XAxis dataKey="frequency" type="number"
								label={{ value: "Hz", position: "insideBottomRight", offset: -20 }}
								tickFormatter={ts => ts}
								allowDataOverflow={true}
								// domain={[this.state.zoom.left, this.state.zoom.right]}
							/>						
							}
							{!this.state.fourier &&
							<XAxis dataKey="time" type="number"
								label={{ value: "Time of Day", position: "insideBottomRight", offset: -20 }}
								tickFormatter={ts => timeString(new Date(parseInt(ts)))}
								allowDataOverflow={true}
								domain={[this.state.zoom.left, this.state.zoom.right]}
							/>
							}
							<YAxis type="number"
							tickFormatter={val => val.toPrecision(PREC)}
							/>
							<Tooltip formatter={(value, name, props) => value.toPrecision(PREC)}
								labelFormatter={(label) => timeString(new Date(parseInt(label)))} />
							<Legend />
							<ReferenceArea x1={this.state.leftLabel} x2={this.state.rightLabel} stroke="red" strokeOpacity={0.3} />
							{this.state.fourier &&
								<Line key={"mag"} type="monotone" dataKey={"magnitude"} stroke="red" />
							}
							{!this.state.fourier && this.state.filters.map((filter, i) =>
								<Line key={`line${i}`} type="monotone" dataKey={filter.name} stroke={getColor(i)} />
							)}
						</LineChart>
					</ResponsiveContainer>
				</Modal.Body>

				<Modal.Footer>
					<div className="d-flex modal-btn-flex">
					<Button variant="secondary" onClick={_ => this.props.onClose(false)}>Close</Button>
					<Button variant="secondary" onClick={_ => this.runFFT()}>FourierIt!</Button>
					<Button variant="secondary" download={this.state.filename} href={createSpreadsheet(this.props.data, this.props.filters)} >Download CSV</Button>
						{shouldZoom && <Button variant="secondary" onClick={_ => this.zoomOut()}>Zoom Out</Button>}
						<Button variant="primary" onClick={_ => this.props.onClose(true)}>Add Variable</Button>
					</div>
				</Modal.Footer>
			</Modal>
		);
	}
}

export default ChartModal;
