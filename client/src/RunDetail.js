import React, { Component } from 'react';
import { Card, CardColumns, Spinner, Jumbotron, Form, Button } from 'react-bootstrap';
import { createFilterForVariable } from './filters';
import ChartModal from './Chart';
import './RunDetail.css';
import { handleServerError, handleClientAsyncError } from './util';

export class Run extends Component {
	constructor(props) {
		super(props);
		this.state = { loading: false, plot: [], showPlot: false };
		this.closePlot = this.closePlot.bind(this);

		// download this run's data
		fetch(this.getRunURL())
			.then(res => res.json())
			.then(handleServerError)
			.then(run => this.load(run))
			.catch(handleClientAsyncError);
		// download global filters
		fetch(process.env.REACT_APP_API_SERVER + "/api/filters")
			.then(res => res.json())
			.then(handleServerError)
			.then(filters => this.setState({ filters }))
			.catch(handleClientAsyncError);
	}
	getRunTechnicalType() {
		let props = this.props;
		if (typeof(props.id) == 'object' && props.id.hasOwnProperty("start")) {
			return "range";
		} else {
			return "single";
		}
	}
	getRunURL() {
		let props = this.props;
		if (this.getRunTechnicalType() == "range") {
			return process.env.REACT_APP_API_SERVER + `/api/runs/range/${props.id.start.toISOString()}/${props.id.end.toISOString()}`;
		} else {
			return process.env.REACT_APP_API_SERVER + `/api/runs/${props.id}`;
		}
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
        return this.state.filters
	}

	handleSubmit(event) {
		event.preventDefault();

		this.setState({ loading: true });

		let data = {
			type: this.typeRef.value,
			description: this.descRef.value,
		};

		fetch(process.env.REACT_APP_API_SERVER + "/api/runs/" + this.props.id, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        })
            .then(resp => resp.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                } else {
                    this.setState({ saved: true })
                }
            })
            .catch(handleClientAsyncError)
            .finally(_ => {
                this.setState({ loading: false })
            })
	}

	render() {
		if (this.state.run && this.state.filters) {
			return (
				<div className="run">
					{this.state.showPlot &&
						<div>
							<ChartModal filters={this.state.plot} data={this.state.run.data} onClose={this.closePlot} />
						</div>
					}
					<Jumbotron>
						<h1>Run {this.state.run.runofday} on {new Intl.DateTimeFormat("en-US").format(new Date(this.state.run.date))}</h1>
						{this.getRunTechnicalType() == "single" && <>
						<p>Location: {this.state.run.location}</p>
						<Form onSubmit={this.handleSubmit.bind(this)}>
							<Form.Group controlId="editRun.type">
								<Form.Label>Run Type</Form.Label>
								<Form.Control as="select" ref={node => this.typeRef = node}
								defaultValue={this.state.run.type} onChange={_ => this.setState({ saved: false })}>
									<option>Acceleration</option>
									<option>Autocross</option>
									<option>Skidpad</option>
									<option>Brake</option>
									<option>Endurance</option>
									<option>Everything</option>
									<option>Misc Testing</option>
								</Form.Control>
							</Form.Group>
							<Form.Group controlId="editRun.description">
								<Form.Label>Run Description</Form.Label>
								<Form.Control type="text" placeholder="Driver Name, Run #"
								ref={node => this.descRef = node}
								defaultValue={this.state.run.description}
								onChange={_ => this.setState({ saved: false })}
								/>
							</Form.Group>
							<Button variant="primary" type="submit" disabled={this.state.loading}>Save</Button>
							{this.state.loading && <Spinner animation="border" role="status" />}
							{this.state.saved && <p>Saved.</p>}
						</Form>
						</>}
					</Jumbotron>
					<h1>Available filters</h1>
					<CardColumns>
						{this.state.filters.map((filter, index) =>
							<Card key={`filter${index}`} style={{ width: '18rem' }}>
								<Card.Body>
									<Card.Title>{filter.name}</Card.Title>
									<Card.Link href="#plot" onClick={_ => this.plotFilter(filter)}>Plot</Card.Link>
								</Card.Body>
							</Card>
						)}
					</CardColumns>
					<h1>Variables in this data</h1>
					<CardColumns>
						{this.state.variables.map((vari, index) =>
							<Card key={`variable${index}`}  style={{ width: '18rem' }}>
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