import React, { Component } from 'react';
import { Navbar, Nav, NavDropdown, Form, FormControl, Button, ListGroup, Card, CardColumns, Breadcrumb, Spinner, Table } from 'react-bootstrap';
import './App.css';

class App extends Component {
	constructor(props) {
		super(props);
		this.state = { mode: "runs", runid: 0 }
		this.openRun = this.openRun.bind(this);
		this.closeRun = this.closeRun.bind(this);
	}

	render() {
		return (
			<div className="App">
				<Navbar bg="light" expand="lg">
					<Navbar.Brand href="#home">Data Logger</Navbar.Brand>
					<Navbar.Toggle aria-controls="basic-navbar-nav" />
					<Navbar.Collapse id="basic-navbar-nav">
						<Nav className="mr-auto">
						<Nav.Link href="#home"onClick={this.closeRun}>Runs</Nav.Link>
					</Nav>
					</Navbar.Collapse>
				</Navbar>
				<Breadcrumb>
					<Breadcrumb.Item href="#" active={this.state.mode === "runs"} onClick={this.closeRun}>Home</Breadcrumb.Item>
					{ this.state.mode === "single" &&
							<Breadcrumb.Item href="#" active>Run {this.runid}</Breadcrumb.Item>
					}
				</Breadcrumb>
				{ this.state.mode === "runs" &&
					<Runs onOpenRun={this.openRun} />
				}
				{ this.state.mode === "single" &&
					<Run id={this.state.runid} />
				}
			</div>
		);
	}

	openRun(id) {
		this.setState({ mode: "single", runid: id});
	}

	closeRun() {
		this.setState({ mode: "runs" });
	}

}

class Runs extends Component {
	constructor(props) {
		super(props);
		this.state = {runs: []};
	}

	componentDidMount() {
		fetch(process.env.REACT_APP_API_SERVER + "/api/runs")
			.then(res => res.json())
			.then(runs => this.setState({ runs }));
	}

	render() {
		return (
				<CardColumns>
					{this.state.runs.map(run => 
						<Card style={{ width: '18rem' }}>
							<Card.Body>
								<Card.Title>
									{new Intl.DateTimeFormat("en-US").format(new Date(run.date))} Run {run.runofday}
								</Card.Title>
								<Card.Text>
									{run.location}
								</Card.Text>
								<Button variant="primary" onClick={() => this.props.onOpenRun(run.id)}>View data</Button>
							</Card.Body>
						</Card>
					)}
				</CardColumns>
		);
	}
}

class Run extends Component {
	constructor(props) {
		super(props);
		this.state = {};
		fetch(process.env.REACT_APP_API_SERVER + "/api/runs/" + props.id)
			.then(res => res.json())
			.then(run => this.load(run));
	}
	load(run) {
		let variables = new Set();
		for (let measure of run.data) {
			for (let property of Object.keys(measure)) {
				if (property !== "time") {
					variables.add(property);
				}
			}
		}
		variables = Array.from(variables);
		this.setState({ run, variables });
	}
	render() {
		if (this.state.run) {
		return (
			<div className="run">
				<h1>Variables in this data</h1>
				<CardColumns>
				{this.state.variables.map(vari =>
					<Card style={{ width: '18rem' }}>
						<Card.Body>
							<Card.Title>
									{vari}
							</Card.Title>
							<Card.Link href="#">Plot</Card.Link>
						</Card.Body>
					</Card>
				)}
				</CardColumns>
				<h1>Raw Data</h1>
				<Table striped bordered hover>
					<thead>
						<tr>
							<th>time</th>
							{this.state.variables.map(vari => <th>{vari}</th>)}
						</tr>
					</thead>
					<tbody>
							{this.state.run.data.map(record => {
								let d = new Date(record.time);
								return (
								<tr>
									<td>{`${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}:${d.getMilliseconds()}`}</td>
										{this.state.variables.map(vari =>
											<td>{record[vari]}</td>
										)}
								</tr>
								);
							}
					)}
					</tbody>
				</Table>
			</div>
		);
		} else {
			return <div className="run"><Spinner animation="border" role="status" /></div>;
		}
	}
}

export default App;
