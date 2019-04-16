import React, { Component } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { timeString } from './util';
import { calculateFilterValue } from './filters';

const colors = ["red", "blue", "green", "purple", "orange", "gray", "gold", "indigo", "navy", "darkslategray"];
function getColor(i) {
	if (i > 10) {
		return "#000000";
	} else {
		return colors[i];
	}
}

export class ChartModal extends Component {
	constructor(props) {
		super(props);
		this.state = this.update({}, props);
	}

	componentDidMount() {
	}

	componentDidUpdate(oldprops) {
		if (this.props.filters.length !== oldprops.filters.length)
			this.setState((state, props) => this.update(state, props));
	}

	update(state, props) {
		state.data = props.data;
		state.filters = props.filters;
		// Load filters and calculate the LCs
		state.title = "";
		for (let filter of props.filters) {
			console.log(filter)
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

		// Simplify the line by pruning points. TODO use Ramer-Douglas-Peucker or some better alg.
		const maxPoints = 1000;
		// unit of time between points to keep
		const timeskip = (state.data[state.data.length - 1].time - state.data[0].time) / maxPoints;

		if (state.data.length > maxPoints) {
			let ltime = 0;
			state.data = state.data.filter(d => {
				if ((d.time - ltime) > timeskip) {
					ltime = d.time;
					return true;
				}
				return false;
			});
		}
		return state;
	}

	render() {
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
					>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis dataKey="time"
							label={{ value: "Time of Day", position: "insideBottomRight", offset: -20 }}
							tickFormatter={ts => timeString(new Date(parseInt(ts)))} />
						<YAxis />
						<Tooltip formatter={(value, name, props) => value}
							labelFormatter={(label) => timeString(new Date(parseInt(label)))} />
						<Legend />
						{this.state.filters.map((filter, i) =>
							<Line type="monotone" dataKey={filter.name} stroke={getColor(i)} />
						)}
					</LineChart>
					</ResponsiveContainer>
				</Modal.Body>

				<Modal.Footer>
				<Button variant="secondary" onClick={_ => this.props.onClose(false)}>Close</Button>
				<Button variant="primary" onClick={_ => this.props.onClose(true)}>Add Variable</Button>
				</Modal.Footer>
			</Modal>
		);
	}
}

export default ChartModal;