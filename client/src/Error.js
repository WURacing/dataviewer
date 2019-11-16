import React, { Component } from 'react';

export class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false };
	}

	getReportURL(error, info) {
		let title = "Autodetected " + error.toString();
		let body = "This error was automatically detected by the app.\n\n";
		body += "What was going on:\n";
		body += "[PLEASE FILL THIS IN WITH INFORMATION ABOUT WHAT YOU WERE TRYING TO DO WHEN THE WEBSITE CRASHED. e.g. 'I was trying to plot filter X']\n\n";
		body += "Steps to Reproduce:\n";
		body += "* [PLEASE FILL THIS IN WITH EXACT/SIMILAR STEPS TO REPRODUCE, USE BULLETS. EX:]\n";
		body += "* [I clicked on 2019-11-10 Run 1]\n";
		body += "* [I clicked on Plot Filter X]\n\n";
		body += "Collected error details: (DO NOT EDIT THIS)\n";
		body += error.toString();
		body += "\n";
		body += info.componentStack;
		body += "\n---------------------------\n";
		return `https://github.com/WURacing/dataviewer/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
	}

	componentDidCatch(error, info) {
		// Display fallback UI
		this.setState({ hasError: true, error: error, info: info.componentStack, reporturl: this.getReportURL(error,info)});
		// You can also log the error to an error reporting service
		// logErrorToMyService(error, info);
	}

	render() {
		if (this.state.hasError) {
			// You can render any custom fallback UI
			return (
				<>
					<h1>Something went wrong.</h1>
					<p><a href={this.state.reporturl}>Please click here to report the error to Ethan and Connor.</a> You will need a GitHub account.</p>
					<h2>Details we know about this error</h2>
					<p>{ this.state.error.toString() }</p>
					<h2>Where the error occurred</h2>
					<p>{ this.state.info }</p>
				</>
			);
		}
		return this.props.children;
	}
}