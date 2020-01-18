import React, { Component } from 'react';
import { Card, CardColumns, Spinner, Jumbotron, Form, Button } from 'react-bootstrap';
import { createFilterForVariable } from './filters';
import ChartModal from './Chart';
import DialogModal from './Dialog';
import './RunDetail.css';
import { ServerError } from './util';
import SortedTable from './components/SortableTable';
import { clearInterval } from 'timers';

export class Run extends Component {
	constructor(props) {
		super(props);
		this.state = { loading: false, plot: [], showPlot: false, showWait: false };
		this.closePlot = this.closePlot.bind(this);

		// download this run's data
		fetch(this.getRunURL())
			.then(res => res.json())
			.then(run => this.load(run))
			.catch(error => this.setState(() => { throw new ServerError(`Downloading run data for ${this.getRunURL()} failed`, error); }));
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
		if (this.getRunTechnicalType() === "range") {
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
			let vars = [];
			let filters = state.plot.concat([filter]);
			for (let filter of filters) {
				vars = vars.concat(filter.required);
			}
			if (vars.length > 0) {
				this.downloadData(vars)
					.catch(error => this.setState(() => { throw new ServerError("Downloading data for run failed, " + JSON.stringify({ start: this.state.run.meta.start, end: this.state.run.meta.end, vars: vars }), error); }));
				return { plot: filters, showWait: true, waitMessage: "Waiting to download data..." };
			} else {
				alert("There's no way to plot this filter! It doesn't depend on any variables. Please check the expression on the Filters tab! Alternatively, if you're trying to plot a constant function, please plot any other variable first!");
				return {};
			}
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
		let printout = true;
		let timer = window.setInterval(() => { printout = true; }, 100);
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
				if (printout) {
					printout = false;
					this.setState({ waitMessage: `Received ${receivedLength} bytes` });
				}
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
		window.clearInterval(timer);

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
			.catch(error => this.setState(() => { throw new ServerError(`Updating run ${this.props.id} failed, ${JSON.stringify(data)}`, error); }))
			.finally(_ => {
				this.setState({ loading: false })
			})
	}

	getFilterColumns() {
		return [
			{
				key: 'name',
				text: 'Name'
			},
			{
				key: 'units',
				text: 'units'
			},
			{
				key: 'description',
				text: 'Description'
			},
			{
				key: 'plot',
				text: ''
			}
		];
	}

	getFilterRows(filters) {
		return filters.map((filter) => {
			console.log(filter);
			return {
				name: filter.name,
				units: filter.units != undefined ? filter.units : '',
				description: filter.description,
				plot: <a href="#plot" onClick={_ => this.plotFilter(filter)}>Plot</a>,
			}
		});
	}

	getSignalColumns() {
		return [
			{
				key: 'name',
				text: 'Name'
			},
			{
				key: 'units',
				text: 'units'
			},
			{
				key: 'plot',
				text: ''
			}
		];
	}

	getSignalRows(signals) {
		return signals.map((signal) => {
			return {
				name: signal.name,
				units: signal.units != undefined ? signal.units : '',
				plot: <a href="#plot" onClick={_ => this.plotVariable(signal)}>Plot</a>,
			}
		});
	}

	render() {
		if (this.state.run && this.state.filters) {
			return (
				<div className="run">
					{this.state.showWait &&
						<div>
							<DialogModal title={"Data Download"} message={this.state.waitMessage} onClose={null} />
						</div>
					}
					{this.state.showPlot &&
						<div>
							<ChartModal data={this.state.data} filters={this.state.plot} onClose={this.closePlot} />
						</div>
					}
					<Jumbotron>
						{this.getRunTechnicalType() === "single" && <>
							<h1>Run {this.state.run.meta.runofday} on {new Intl.DateTimeFormat("en-US").format(new Date(this.state.run.meta.start))}</h1>
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
						{this.getRunTechnicalType() === "range" && <>
							<h1>Data from {new Intl.DateTimeFormat("en-US").format(new Date(this.state.run.meta.start))} to {new Intl.DateTimeFormat("en-US").format(new Date(this.state.run.meta.end))}</h1>
							<p>Location: {this.state.run.meta.location}</p>
						</>}
					</Jumbotron>
					<h1>Filters applicable to this run</h1>
					<SortedTable
						columns={this.getFilterColumns()}
						rows={this.getFilterRows(this.state.filters)}
						sortColumns={undefined}
						small
					/>
					<h1>Variables in this data</h1>
					<SortedTable
						columns={this.getSignalColumns()}
						rows={this.getSignalRows(this.state.variables)}
						sortColumns={undefined}
						small
					/>
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