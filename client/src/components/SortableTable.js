import React, { Component } from 'react';
import { Container, Row, Col, Table, ToggleButtonGroup, ToggleButton } from 'react-bootstrap';

export class SortableTable extends Component {
    constructor(props) {
        super(props);
        this.state = {
            sortIndex: 0,
            sortedRows: this.props.rows
        }
    }

    changeSort(val) {
        let rows = this.state.sortedRows;
        this.setState({
            sortIndex: val,
            sortedRows: rows.sort(this.props.sortColumns[val].fn(this.props.sortColumns[val].key))
        });
    }

    componentWillReceiveProps(nextProps) {
        this.setState({
            sortIndex: 0,
            sortedRows: nextProps.rows
        });
    }

    render() {
        return (
            <>
                {this.props.sortColumns != undefined &&
                    <Container>
                        <Row>
                            <span className="align-self-center">Sort By: &nbsp;&nbsp; </span>

                            <ToggleButtonGroup type="radio" name="sort" value={this.state.sortIndex} onChange={this.changeSort.bind(this)}>
                                {this.props.sortColumns.map((item, index) =>
                                    <ToggleButton key={index} value={index}>
                                        {item.text}
                                    </ToggleButton>
                                )}
                            </ToggleButtonGroup>
                        </Row>
                    </Container>
                }
                <Table striped size={this.props.small ? "sm" : "lg"} hover>
                    <thead>
                        <tr>
                            {this.props.columns.map((item, index) =>
                                <th key={`item${item}index${index}`}>{item.text}</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {this.state.sortedRows.map((row, index) =>
                            <tr key={`${index}`}>
                                {this.props.columns.map((item, index) =>
                                    <td key={`${index}`}>{row[item.key]}</td>
                                )}
                            </tr>
                        )}
                    </tbody>
                </Table>
            </>
        );
    }
}

export default SortableTable;