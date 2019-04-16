import React, { Component } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { timeString } from './util';

export class ChartModal extends Component {
	constructor(props) {
		super(props);
		const maxPoints = 500;
		if (props.data.length < maxPoints) {
			this.data = props.data;
		} else {
			this.data = [];
			let ltime = 0;
			// unit of time between points to keep
			let timeskip = (props.data[props.data.length - 1].time - props.data[0].time) / maxPoints;
			for (let d of props.data) {
				if ((d.time - ltime) > timeskip) {
					// keep points within this interval
					this.data.push(d);
					ltime = d.time;
				}
			}
		}
	}
	render() {
		return (
			<Modal.Dialog onHide={this.props.onClose}>
				<Modal.Header closeButton>
					<Modal.Title>Plot of {this.props.filter.name}</Modal.Title>
				</Modal.Header>

				<Modal.Body>
					<LineChart
						width={500}
						height={300}
						data={this.data}
						margin={{
							top: 30, right: 80, left: 30, bottom: 10,
						}}
					>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis dataKey="time"
							label={{ value: "Time of Day", position: "insideBottomRight", offset: -20 }}
							tickFormatter={ts => timeString(new Date(parseInt(ts)))} />
						<YAxis />
						<Tooltip formatter={(value, name, props) => value} />
						<Legend />
						<Line type="monotone" dataKey={this.props.filter.name} stroke="#ff0000" />
					</LineChart>
				</Modal.Body>

				<Modal.Footer>
					<Button variant="secondary" onClick={this.props.onClose}>Close</Button>
				</Modal.Footer>
			</Modal.Dialog>
		);
	}
}

export default ChartModal;