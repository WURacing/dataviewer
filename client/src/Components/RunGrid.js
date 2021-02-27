import React from 'react';
import { DataGrid, GridRowsProp, GridColDef } from '@material-ui/data-grid';
import { sizing } from '@material-ui/system';
import Box from '@material-ui/core/Box';

class RunGrid extends React.Component{
    constructor(props){
        super(props);
        this.state={
            error: null, 
            isLoaded: false, 
            runData: [],
            GridColDef : [
                {field: 'col0', headerName: 'Date', width: 100},
                {field: 'col1', headerName: 'Location', width: 100},
                {field: 'col2', headerName: 'Start', width: 150},
                {field: 'col3', headerName: 'End', width: 150},
            ],
        };
    }
    componentDidMount(){
        fetch("https://data.washuracing.com/api/v2/testing")
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

    createRows(runData){
        var idNum = 0
        var GridRowsProp = []
        const dateOptions = {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: '2-digit'
        }
        const timeOptions = {
            timeZone:'America/Chicago',
            hour12: true,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }

        this.state.runData.forEach((run) => {
            var date = new Date(run.date).toLocaleDateString(dateOptions)
            var startTime = run.start.slice(0,8) 
            var start = this.tConvert(startTime)
            var endTime = run.end.slice(0, 8)
            var end = this.tConvert(endTime)
            var row = {id: idNum++, col0: date, col1: run.location, col2: start, col3: end}        
            GridRowsProp.push(row)
        });
        return GridRowsProp;
    }

    render(){
        const{error, isLoaded, GridColDef} = this.state;
        var GridRowsProp = this.createRows(this.state.runData)
        if(error){
            return <div>Error</div>
        }
        else if(!isLoaded){
            return <div>Did not load</div>
        }
        else{
            return(
            <Box height={500} width ='25%'>
                <DataGrid pagination rows={GridRowsProp} columns={GridColDef} checkboxSelection/>
            </Box>)
        }
    }
}
export default RunGrid;

