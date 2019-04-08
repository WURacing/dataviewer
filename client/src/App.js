import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

class App extends Component {
	state = {runs: []}
	componentDidMount() {
		fetch("/runs")
			.then(res => res.json())
			.then(runs => this.setState({ runs }));
	}

	render() {
		return (
			<div className="App">
				<h1>Runs:</h1>
				<ol>
					{this.state.runs.map(run => 
						<li value={run.id}>{new Intl.DateTimeFormat("en-US").format(new Date(run.date))} at {run.location}</li>
					)}
				</ol>
			</div>
		);
	}
}

export default App;
