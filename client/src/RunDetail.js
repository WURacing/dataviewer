import React, { Component } from 'react';
import { Card, CardColumns, Spinner } from 'react-bootstrap';
import { createFilterForVariable } from './filters';
import ChartModal from './Chart';
import './RunDetail.css';

export class Run extends Component {
	constructor(props) {
		super(props);
		this.state = { plot: [], showPlot: false };
		this.closePlot = this.closePlot.bind(this);
		// download this run's data
		fetch(process.env.REACT_APP_API_SERVER + "/api/runs/" + props.id)
			.then(res => res.json())
			.then(run => this.load(run));
		// download global filters
		fetch(process.env.REACT_APP_API_SERVER + "/api/filters")
            .then(res => res.json())
            .then(filters => this.setState({ filters }));

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
		variables = Array.from(variables).sort();
		this.setState({ run, variables });
	}
	plotVariable(variable) {
		let filter = createFilterForVariable(variable);
		return this.plotFilter(filter);
	}
	plotFilter(filter) {
		this.setState((state, props) => {
			let filters = state.plot.concat([filter]);
			return { plot: filters, showPlot: true };
		});
	}
	closePlot(keepAlive) {
		if (keepAlive)
			this.setState({ showPlot: false })
		else
			this.setState({ plot: [], showPlot: false })
	}
	filterList() {
        return Object.keys(this.state.filters).map(filter => {
            return { name: filter, weights: this.state.filters[filter] }
        })
    }
	render() {
		if (this.state.run && this.state.filters) {
			return (
				<div className="run">
					{this.state.showPlot &&
						<div>
							<a className="anchor" href="#plot" name="plot">Plots</a>
							<ChartModal filters={this.state.plot} data={this.state.run.data} onClose={this.closePlot} />
						</div>
					}
					<h1>Available filters</h1>
					<CardColumns>
						{this.filterList().map(filter =>
							<Card style={{ width: '18rem' }}>
								<Card.Body>
									<Card.Title>{filter.name}</Card.Title>
									<Card.Link href="#plot" onClick={_ => this.plotFilter(filter)}>Plot</Card.Link>
								</Card.Body>
							</Card>
						)}
					</CardColumns>
					<h1>Variables in this data</h1>
					<CardColumns>
						{this.state.variables.map(vari =>
							<Card style={{ width: '18rem' }}>
								<Card.Body>
									<Card.Title>{vari}</Card.Title>
									<Card.Link href="#plot" onClick={_ => this.plotVariable(vari)}>Plot</Card.Link>
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