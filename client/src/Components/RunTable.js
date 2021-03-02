import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import Box from '@material-ui/core/Box';
import { makeStyles } from '@material-ui/core/styles';
import Collapse from '@material-ui/core/Collapse';
import IconButton from '@material-ui/core/IconButton';
import GetAppIcon from '@material-ui/icons/GetApp';
import Button from '@material-ui/core/Button';

class RunTable extends React.Component{
    constructor(props){
        super(props);
        this.state={
            apiPath: this.props.apiPath,
            error: null, 
            isLoaded: false, 
            runData: [],
            open: false,
            setOpen: false,
            useRowStyles: makeStyles({
                root: {
                  '& > *': {
                    borderBottom: 'unset',
                  },
                },
              }),
            dateOptions: {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: '2-digit'
            }
        };
    }
   
    // api fetch based on api path sent
    // Note: api path should be reserved for all testing data or a subset of testing days     
    componentDidMount(){
        fetch(this.state.apiPath)
            .then(res => res.json())
            .then(
                (result) =>{
                    this.setState({
                        isLoaded: true,
                        runData: result
                    });
                },
            (error) => {
                this.setState({
                    isLoaded: true,
                    error
                });
            }
            )
    }

    // getCSV(apiPath){
    //     fetch(apiPath)
    //         .then(responce)
    // }
    //pretty print for time stamps
    tConvert(time) {
        // Check correct time format and split into components
        time = time.toString ().match (/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];
      
        if (time.length > 1) { // If time format correct
          time = time.slice (1);  // Remove full string match value
          time[5] = +time[0] < 12 ? ' AM' : ' PM'; // Set AM/PM
          time[0] = +time[0] % 12 || 12; // Adjust hours
        }
        return time.join (''); // return adjusted time or original string
    }

    //create dict for interval row content
    createIntervalRow(interval, testingDate){
        var startTime = interval.start.slice(0,8) 
        var start = this.tConvert(startTime)
        var endTime = interval.end.slice(0, 8)
        var end = this.tConvert(endTime)
        var apiLink = "https://data.washuracing.com/api/v2/testing/" + testingDate + "/" + interval.start + '/' + interval.end + '/data.csv';
        return({
            intervalStart: start, 
            intervalEnd: end, 
            intervalApiLink: apiLink, 
            intervalDescription: interval.description
        })
    }

    // create table fragment for run data 
    //run + intervals -> table row
    createRunRow(run){
        var intervalRows = []
        const classes = this.state.useRowStyles;
        var date = new Date(run.date).toLocaleDateString(this.state.dateOptions)
        var startTime = run.start.slice(0,8) 
        var start = this.tConvert(startTime)
        var endTime = run.end.slice(0, 8)
        var end = this.tConvert(endTime)
        var apiLink = "https://data.washuracing.com/api/v2/testing/" + run.date + '/' + run.start + '/' + run.end +'/data.csv'

        run.intervals.forEach(interval => {
            intervalRows.push(this.createIntervalRow(interval, run.date))
        });

        return(
            <React.Fragment>
                <TableRow className={classes.root}>
                    <TableCell>
                        <IconButton aria-label="expand row" size="small" 
                        onClick={() =>this.setState({open: !this.state.open})}>
                            {this.state.open ? <KeyboardArrowUpIcon/> : <KeyboardArrowDownIcon />}
                        </IconButton>
                    </TableCell>
                    <TableCell component="th" scope="row">{date}</TableCell>
                    <TableCell>{run.location}</TableCell>
                    <TableCell>{start}</TableCell>
                    <TableCell>{end}</TableCell>
                    <TableCell>
                    <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        className={classes.button}
                        startIcon={<GetAppIcon />}
                        href ={apiLink}
                    >
                        Save
                    </Button>
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                        <Collapse in={this.state.open} timeout='auto' unmountOnExit>
                            <Box margin={1}>
                            <Typography variant="h6" gutterBottom component="div">
                                Intervals
                            </Typography>
                            <Table size ='small'>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Description</TableCell>
                                        <TableCell>Start Time</TableCell>
                                        <TableCell>End Time</TableCell>
                                        <TableCell>Download</TableCell>
                                    </TableRow>  
                                </TableHead>
                                <TableBody>
                                    {intervalRows.map((interval) =>(
                                    <TableRow>
                                        <TableCell component="th" scope="row">{interval.intervalDescription}</TableCell>
                                        <TableCell>{interval.intervalStart}</TableCell>
                                        <TableCell>{interval.intervalEnd}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                size="small"
                                                className={classes.button}
                                                startIcon={<GetAppIcon />}
                                                href ={interval.intervalApiLink}
                                            >
                                                Save
                                            </Button>
                                            
                                        </TableCell>
                                    </TableRow>
                                     ))}
                                </TableBody>
                            </Table> 
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
            </React.Fragment>
        )
    }

    render(){
        const{error, isLoaded, runData} = this.state;
        if(error){
            return <div>Error</div>
        }
        else if(!isLoaded){
            return <div>Did not load</div>
        }
        else{
            console.log(runData)
            return (
                <TableContainer component={Paper}>
                  <Table aria-label="collapsible table">
                    <TableHead>
                      <TableRow>
                        <TableCell />
                        <TableCell>Date</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Start Time</TableCell>
                        <TableCell>End Time</TableCell>
                        <TableCell>Download</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {runData.map((row) => (
                        this.createRunRow(row)
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              );
        }
    }

}
export default RunTable 