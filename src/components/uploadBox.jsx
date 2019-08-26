import React, { Component } from 'react';

import { withStyles } from '@material-ui/core/styles';

import Card from '@material-ui/core/Card';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Divider from '@material-ui/core/Divider';
import DeleteIcon from '@material-ui/icons/Delete';
import KeyboardArrowRight from '@material-ui/icons/KeyboardArrowRight';
import SyncIcon from '@material-ui/icons/Sync';
import { List, ListItem, ListItemText, InputLabel, FormControl, Select, Input, MenuItem, ListItemSecondaryAction, IconButton } from '@material-ui/core';

const styles = theme => ({
    container: {
        margin: 10
    },
    firstRow: {
        minHeight: '40vh'
    },
    list: {
        backgroundColor: '#232323',
        color: '#dedede',
    },
    listItem: {
        '&:hover': {
            backgroundColor: '#333333',
            cursor: 'pointer'
        }
    },
    divider: {
        backgroundColor: '#909090'
    },
    formControl: {
        width: '100%'
    },
    selectInput: {
        color: '#dedede',
        backgroundColor: '#232323',
        padding: 10,
        paddingLeft: 15
    },
    selectIcon: {
        color: '#dedede'
    },
    selectMenu: {
        color: '#dedede',
        backgroundColor: '#232323'
    },
    inputLabel: {
        color: '#232323',
        fontSize: '1.3em',
        fontWeight: 300
    }
});


class UploadBox extends Component {

    constructor(props) {
        super(props);
        // TODO make dynamic
        this.state = {
            queuedFiles: [
                'LOG0001.csv',
                'LOG0002.csv',
                'LOG0003.csv',
                'LOG0004.csv'
            ],

        }
    }

    handleChange(event) {
        setValues(oldValues => ({
            ...oldValues,
            [event.target.name]: event.target.value,
        }));
    }

    render() {

        const { classes } = this.props;

        const files = this.state.queuedFiles.map(f => (
            <ListItem key={f} className={classes.listItem}>
                <ListItemText primary={f} />
                <ListItemSecondaryAction>
                    <IconButton edge="end">
                        <DeleteIcon color='primary' />
                    </IconButton>
                </ListItemSecondaryAction>
            </ListItem>
        ));

        return (
            <Grid container className={classes.container} spacing={5}>
                <Grid item xs={false} md={2}></Grid>
                <Grid item xs={4} md={3}>
                    <List className={`${classes.list} ${classes.firstRow}`}>
                        <ListItem>
                            <ListItemText primary='Upload Files' />
                        </ListItem>
                        <Divider className={classes.divider} />
                        <ListItem className={classes.listItem}>
                            <ListItemText primary='Upload From Computer' />
                            <ListItemSecondaryAction>
                                <IconButton edge="end">
                                    <KeyboardArrowRight color='primary' />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                        <ListItem className={classes.listItem}>
                            <ListItemText primary='Sync with S3' />
                            <ListItemSecondaryAction>
                                <IconButton edge="end">
                                    <SyncIcon color='primary' />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                    </List>
                </Grid>
                <Grid item xs={3} md={2}>
                    <Card>
                        <List className={`${classes.list} ${classes.firstRow}`}>
                            <ListItem>
                                <ListItemText primary='Staged Files' />
                            </ListItem>
                            <Divider className={classes.divider} />
                            {files}
                        </List>
                    </Card>
                </Grid>
                <Grid item xs={5} md={3}>
                    <FormControl className={classes.formControl}>
                        <InputLabel shrink htmlFor='car-model-year' className={classes.inputLabel}>
                            Car Model Year
                        </InputLabel>
                        <Select
                            value={'wufr-20'}
                            className={classes.selectInput}
                            inputProps={{
                                classes: {
                                    icon: classes.selectIcon,
                                    selectMenu: classes.selectMenu
                                }
                            }}
                            onChange={this.handleChange}
                            input={<Input name='model' id='car-model-year' />}
                            displayEmpty
                            name='age'
                        >
                            <MenuItem value={'wufr-20'}>WUFR-20</MenuItem>
                            <MenuItem value={'wufr-19'}>WUFR-19</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={false} md={2}></Grid>
                <Grid item xs={3}>
                </Grid>
                <Grid item xs={3}>
                </Grid>
                <Grid item xs={3}>
                </Grid>
                <Grid item xs={3}>
                </Grid>
            </Grid>
        );
    }
}

export default withStyles(styles)(UploadBox);