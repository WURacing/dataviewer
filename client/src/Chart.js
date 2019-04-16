import React, { Component } from 'react';
import { Button, Modal, ButtonGroup } from 'react-bootstrap';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceArea } from 'recharts';
import { timeString, PREC } from './util';
import { calculateFilterValue } from './filters';
import './Chart.css';

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
		state.data = props.data.slice();
		state.filters = props.filters.slice();
		// Load filters and calculate the LCs
		state.title = "";
		for (let filter of props.filters) {
			state.data = calculateFilterValue(filter, state.data);
			state.title += filter.name + " and ";
		}
		state.title = state.title.substr(0, state.title.length - 5);

		// Delete points not relevant to either variable
		state.data = state.data.filter(dp => {
			for (let filter of props.filters) {
				if (dp.hasOwnProperty(filter.name)) {
					return true;
				}
			}
			return false;
		})


		// Fake continuity (probably needs a better solution like averaging, but this is O(n))
		let prev = {};
		for (let dp of state.data) {
			Object.assign(prev, dp);
			Object.assign(dp, prev);
			dp.time = parseInt(dp.time);
		}

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
		return state;
	}

	nextLabelUpdate = 0;
	leftLabel = null;
	rightLabel = null;

	// start making a selection
	graphStartSelect(e) {
		if (e.activeLabel) {
			this.setState({ leftLabel: e.activeLabel })
			this.leftLabel = e.activeLabel;
		}
	}

	// update right endpoint fo selection
	graphMoveSelect(e) {
		if (e.activeLabel && this.leftLabel) {
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
			if (right < left) {
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
							data={this.state.data}
							margin={{
								top: 30, right: 80, left: 30, bottom: 10,
							}}
							onMouseDown={this.graphStartSelect.bind(this)}
							onMouseMove={this.graphMoveSelect.bind(this)}
							onMouseUp={this.graphEndSelect.bind(this)}
						>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey="time" type="number"
								label={{ value: "Time of Day", position: "insideBottomRight", offset: -20 }}
								tickFormatter={ts => timeString(new Date(parseInt(ts)))}
								allowDataOverflow={true}
								domain={[this.state.zoom.left, this.state.zoom.right]}
							/>
							<YAxis type="number"
							tickFormatter={val => val.toPrecision(PREC)}
							/>
							<Tooltip formatter={(value, name, props) => value.toPrecision(PREC)}
								labelFormatter={(label) => timeString(new Date(parseInt(label)))} />
							<Legend />
							<ReferenceArea x1={this.state.leftLabel} x2={this.state.rightLabel} stroke="red" strokeOpacity={0.3} />
							{this.state.filters.map((filter, i) =>
								<Line key={`line${i}`} type="monotone" dataKey={filter.name} stroke={getColor(i)} />
							)}
						</LineChart>
					</ResponsiveContainer>
				</Modal.Body>

				<Modal.Footer>
					<div className="d-flex modal-btn-flex">
						<Button variant="secondary" onClick={_ => this.props.onClose(false)}>Close</Button>
						{shouldZoom && <Button variant="secondary" onClick={_ => this.zoomOut()}>Zoom Out</Button>}
						<Button variant="primary" onClick={_ => this.props.onClose(true)}>Add Variable</Button>
					</div>
				</Modal.Footer>
			</Modal>
		);
	}
}

export default ChartModal;
