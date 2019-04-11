import React, { Component } from 'react';
import { Navbar, Nav, NavDropdown, Form, FormControl, Button, ListGroup, Card, CardColumns } from 'react-bootstrap';
import './App.css';

class App extends Component {

	render() {
		return (
			<div className="App">
				<Navbar bg="light" expand="lg">
					<Navbar.Brand href="#home">Data Logger</Navbar.Brand>
					<Navbar.Toggle aria-controls="basic-navbar-nav" />
					<Navbar.Collapse id="basic-navbar-nav">
						<Nav className="mr-auto">
						<Nav.Link href="#home">Runs</Nav.Link>
					</Nav>
					</Navbar.Collapse>
				</Navbar>
				<h1>Runs:</h1>
				<Runs />
			</div>
		);
	}

	handleRunClick(event) {
		console.log(event);
	}
}

class Runs extends Component {
	constructor(props) {
		super(props);
		this.state = {runs: []};
		this.handleRunClick = this.handleRunClick.bind(this);
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
								<Button variant="primary" onClick={this.handleRunClick}>View data</Button>
							</Card.Body>
						</Card>
					)}
				</CardColumns>
		);
	}

	handleRunClick(event) {
		console.log(event);
	}
}

class RunPage extends Component {
	constructor(props) {
		super(props);
		this.state = {};
		fetch(process.env.REACT_APP_API_SERVER + "/api/runs/" + props.id)
			.then(res => res.json())
			.then(run => this.setState({ run }));
	}
	render() {
		return (
			<div className="run">
				<p>hey</p>	
			</div>
		);
	}
}

export default App;
