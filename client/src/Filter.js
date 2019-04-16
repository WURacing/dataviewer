import React, { Component } from 'react';
import { Form, Card, Button, Table, CardColumns } from 'react-bootstrap';

function filterEqn(filter) {
    return filter.name + " = " + Object.keys(filter.weights).map((vari) =>
        `${filter.weights[vari]} * ${vari}`
    ).join(" + ");
}

export class Filter extends Component {
    state = { loading: false, filter: { name: "", weights: {} } }
    nameRef = React.createRef();
    variableRef = React.createRef();
    weightRef = React.createRef();

    componentDidMount() {
        this.reload();
    }

    reload() {
        fetch(process.env.REACT_APP_API_SERVER + "/api/filters")
            .then(res => res.json())
            .then(filters => this.setState({ filters }));
    }

    handleSubmit(event) {
        event.preventDefault();
        // Update parameters
        this.setState(state => {
            state.loading = true;
            state.filter.name = this.nameRef.current.value;
            return state;
        })
        // Create new filter
        fetch(process.env.REACT_APP_API_SERVER + "/api/filters", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(this.state.filter)
        })
            .then(resp => resp.json())
            .then(data => {
                // Reset form and reload display
                this.reload();
                this.nameRef.current.value = "";
                this.setState(state => {
                    state.filter.name = "";
                    state.filter.weights = {};
                    return state;
                })
            })
            .catch(error => {
                alert(error)
            })
            .finally(_ => {
                this.setState({ loading: false })
            })
    }

    filterNameChange() {
        // Record change in form field value
        this.setState(state => {
            state.filter.name = this.nameRef.current.value;
            return state;
        })
    }

    addWeight() {
        // Add a new weight to in progress filter
        if (this.variableRef.current.value.length < 1) return;
        this.setState(state => {
            state.filter.weights[this.variableRef.current.value] = this.weightRef.current.value;
            return state;
        }, _ => {
            this.variableRef.current.value = "";
            this.weightRef.current.value = 1;
        })
    }

    filterList() {
        return Object.keys(this.state.filters).map(filter => {
            return { name: filter, weights: this.state.filters[filter] }
        })
    }

    deleteFilter(filter) {
        fetch(process.env.REACT_APP_API_SERVER + "/api/filters/" + filter.name, {
            method: "DELETE",
        })
            .then(resp => {
                // Reload displayu
                this.reload();
            })
            .catch(error => {
                alert(error)
            })
            .finally(_ => {
                this.setState({ loading: false })
            })
    }

    render() {
        return (
            <div className="filters">
                {this.state.filters &&
                    <>
                        <h1>Filters</h1>
                        <CardColumns>
                        {this.filterList().map(filter =>
                            <Card style={{ width: '18rem' }}>
                                <Card.Body>
                                    <Card.Title>{filter.name}</Card.Title>
                                    <Card.Text>{filterEqn(filter)}</Card.Text>
                                    <Button variant="danger" onClick={() => this.deleteFilter(filter)}>Delete</Button>
                                </Card.Body>
                            </Card>
                        )}
                        </CardColumns>
                    </>
                }
                <h1>Add New Filter</h1>
                <Form onSubmit={this.handleSubmit.bind(this)}>
                    <Form.Group controlId="name">
                        <h2>Name of Filter</h2>
                        <Form.Control type="text" placeholder="AccelX" required onChange={this.filterNameChange.bind(this)} ref={this.nameRef} />
                    </Form.Group>
                    <h2>Weights of Raw Data</h2>
                    <Table striped bordered hover>
                        <thead><tr><th>Variable</th><th>Weight</th><th></th></tr></thead>
                        <tbody>
                            {Object.keys(this.state.filter.weights).map(vari =>
                                <tr><td>{vari}</td><td>{this.state.filter.weights[vari]}</td></tr>
                            )}
                            <tr>
                                <td>
                                    <Form.Control type="text" placeholder="EngineSpeed" ref={this.variableRef} />
                                </td>
                                <td>
                                    <Form.Control type="number" placeholder="1" defaultValue="1" ref={this.weightRef} />
                                </td>
                                <td>
                                    <Button variant="primary" onClick={_ => this.addWeight()}>Add</Button>
                                </td>
                            </tr>
                        </tbody>
                    </Table>
                    <h2>Filter's respective linear combination</h2>
                    <Card>
                        <Card.Body>
                            {filterEqn(this.state.filter)}
                        </Card.Body>
                    </Card>

                    <Button variant="primary" type="submit" disabled={this.state.loading}>
                        Create
					</Button>
                </Form>
            </div>
        )
    }
}

export default Filter;