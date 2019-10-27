/**
 * In Redis:
 * run
 *   <id>
 *     date
 *     location
 *     description
 *     type
 *     runofday
 *     data
 *       <ts>
 *         time
 *         <key>: <val>
 */

 class RedisRun
 {
     
     constructor(id, data)
     {
         this.id = id;
         this.date = date;
         this.location = location;
         this.type = type;
         this.runofday = runofday;
     }

     getAllData()
     {

     }
 }

 class DataPoint
 {
     constructor()
 }