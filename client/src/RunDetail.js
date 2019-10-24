import React, { Component } from 'react';
import { Card, CardColumns, Spinner, Jumbotron, Form, Button } from 'react-bootstrap';
import { createFilterForVariable } from './filters';
import ChartModal from './Chart';
import DialogModal from './Dialog';
import './RunDetail.css';
import { handleServerError, handleClientAsyncError } from './util';

export class Run extends Component {
	constructor(props) {
		super(props);
		this.state = { loading: false, plot: [], showPlot: false, showWait: false };
		this.closePlot = this.closePlot.bind(this);

		// download this run's data
		fetch(this.getRunURL())
			.then(res => res.json())
			.then(handleServerError)
			.then(run => this.load(run))
			.catch(handleClientAsyncError);
	}
	getRunTechnicalType() {
		let props = this.props;
		if (typeof (props.id) == 'object' && props.id.hasOwnProperty("start")) {
			return "range";
		} else {
			return "single";
		}
	}
	getRunURL() {
		let props = this.props;
		if (this.getRunTechnicalType() == "range") {
			return process.env.REACT_APP_API_SERVER + `/api/runs/range/${props.id.start.toISOString()}/${props.id.end.toISOString()}/details`;
		} else {
			return process.env.REACT_APP_API_SERVER + `/api/runs/${props.id}/details`;
		}
	}
	/**
	 * 
	 * @param {{variables: any, filters: any, meta: any}} run 
	 */
	load(run) {
		let variables = run.variables.sort((a, b) => a.name.localeCompare(b.name));
		let filters = run.filters.sort((a, b) => a.name.localeCompare(b.name));
		this.setState({ run, variables, filters });
	}
	/**
	 * 
	 * @param {{name: string, id: number}} variable 
	 */
	plotVariable(variable) {
		let filter = createFilterForVariable(variable);
		return this.plotFilter(filter);
	}
	/**
	 * 
	 * @param {{name: string, expression: string, required: number[]}} filter 
	 */
	plotFilter(filter) {
		this.setState((state, props) => {
			let filters = state.plot.concat([filter]);
			let vars = [];
			for (let filter of filters) {
				vars = vars.concat(filter.required);
			}
			this.downloadData(vars);
			return { plot: filters, showWait: true, waitMessage: "Waiting to download data..." };
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

	async downloadData(vars) {
		let varstr = vars.join(",");
		try {
			let response = await fetch(process.env.REACT_APP_API_SERVER + `/api/runs/points/${new Date(this.state.run.meta.start).toISOString()}/${new Date(this.state.run.meta.end).toISOString()}/0/${varstr}`);

			const reader = response.body.getReader();

			let receivedLength = 0;
			let chunks = [];
			while (true) {
				const { done, value } = await reader.read();

				if (done) {
					break;
				}

				chunks.push(value);
				receivedLength += value.length;

				this.setState({ waitMessage: `Received ${receivedLength} bytes` });
			}

			let chunksAll = new Uint8Array(receivedLength);
			let position = 0;
			for (let chunk of chunks) {
				chunksAll.set(chunk, position);
				position += chunk.length;
			}

			let result = new TextDecoder("utf-8").decode(chunksAll);
			let data = JSON.parse(result);
			this.setState({ showWait: false, showPlot: true, data: data });

		} catch (err) {
			this.setState({ showWait: false, waitMessage: err });
			alert(err);
		}

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
					{this.state.showWait &&
						<div>
							<DialogModal title={"Shut up"} message={this.state.waitMessage} onClose={null} />
						</div>
					}
					{this.state.showPlot &&
						<div>
							<ChartModal data={this.state.data} filters={this.state.plot} onClose={this.closePlot} />
						</div>
					}
					<Jumbotron>
						<h1>Run {this.state.run.meta.runofday} on {new Intl.DateTimeFormat("en-US").format(new Date(this.state.run.meta.start))}</h1>
						{this.getRunTechnicalType() == "single" && <>
							<p>Location: {this.state.run.meta.location}</p>
							<Form onSubmit={this.handleSubmit.bind(this)}>
								<Form.Group controlId="editRun.type">
									<Form.Label>Run Type</Form.Label>
									<Form.Control as="select" ref={node => this.typeRef = node}
										defaultValue={this.state.run.meta.type} onChange={_ => this.setState({ saved: false })}>
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
										defaultValue={this.state.run.meta.description}
										onChange={_ => this.setState({ saved: false })}
									/>
								</Form.Group>
								<Button variant="primary" type="submit" disabled={this.state.loading}>Save</Button>
								{this.state.loading && <Spinner animation="border" role="status" />}
								{this.state.saved && <p>Saved.</p>}
							</Form>
						</>}
					</Jumbotron>
					<h1>Filters applicable to this run</h1>
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
						{this.state.variables.map((variable, index) =>
							<Card key={`variable${index}`} style={{ width: '18rem' }}>
								<Card.Body>
									<Card.Title>{variable.name}</Card.Title>
									<Card.Link href="#plot" onClick={_ => this.plotVariable(variable)}>Plot</Card.Link>
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