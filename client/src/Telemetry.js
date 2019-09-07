import React, { Component } from 'react';

export class Telemetry extends Component {
    constructor(props) {
        super(props);
        this.state = { data: {} };
        this.es = new EventSource(process.env.REACT_APP_API_SERVER + '/api/telemetry');
        this.es.addEventListener("message", this.listener.bind(this));
    }

    render() {
        return <ul>{Object.keys(this.state.data).map(key => 
            <li>{key}: {this.state.data[key]}</li>
        )}</ul>;
    }

    listener(msg) {
        console.log(msg)
        let data = JSON.parse(msg.data);
        this.setState(state => {
            state.data[data.key] = data.value;
            return state;
        });
    }
}

export default Telemetry;