import React, { Component } from 'react';
import { Card, CardColumns, Spinner } from 'react-bootstrap';
import { createFilterForVariable, calculateFilterValue } from './filters';
import ChartModal from './Chart';
import './RunDetail.css';

export class Run extends Component {
	constructor(props) {
		super(props);
		this.state = {};
		this.plot = this.plot.bind(this);
		this.closePlot = this.closePlot.bind(this);
		// download this run's data
		fetch(process.env.REACT_APP_API_SERVER + "/api/runs/" + props.id)
			.then(res => res.json())
			.then(run => this.load(run));
	}
	load(run) {
		// get a set of the variables present in this log
		let variables = new Set();
		for (let measure of run.data) {
			for (let property of Object.keys(measure)) {
				if (property !== "time") {
					variables.add(property);
				}
			}
		}
		// data is unsorted by default
		run.data.sort((one, two) => one.time > two.time);
		// JS sets only have limited utility
		variables = Array.from(variables);
		this.setState({ run, variables });
	}
	plot(variable) {
		let filter = createFilterForVariable(variable);
		let data = calculateFilterValue(filter, this.state.run.data);
		this.setState({ plot: {filter, data}});
	}
	closePlot() {
		this.setState({ plot: undefined })
	}
	render() {
		if (this.state.run) {
		return (
			<div className="run">
				{ this.state.plot &&
						<div>
							<a className="anchor" href="#plot" name="plot">Plots</a>
							<ChartModal filter={this.state.plot.filter} data={this.state.plot.data} onClose={this.closePlot} />
						</div>
				}
				<h1>Variables in this data</h1>
				<CardColumns>
				{this.state.variables.map(vari =>
					<Card style={{ width: '18rem' }}>
						<Card.Body>
							<Card.Title>
									{vari}
							</Card.Title>
							<Card.Link href="#plot" onClick={_ => this.plot(vari)}>Plot</Card.Link>
						</Card.Body>
					</Card>
				)}
				</CardColumns>
			</div>
		);
		} else {
			// display an animation while loading
			return (
				<div className="run">
					<Spinner animation="border" role="status" />
				</div>
			);
		}
	}
}

export default Run;