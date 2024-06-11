var lstUrl = _spPageContextInfo.webAbsoluteUrl + '/_api/web/lists/getbytitle';
var stationery =[];
Vue.component('data-table', {
  template: '<table class="table table-bordered"></table>',
  props: ['stationeries'],
  data() {
    return {
      headers: [
        { title: 'Item' },
        { title: 'Quantity' },
        { title: 'Cost' }
      ],
      rows: [] ,
      dtHandle: null
    }
  },
  watch: {
    stationeries(val, oldVal) {
      let vm = this;
      vm.rows = [];
      // You should _probably_ check that this is changed data... but we'll skip that for this example.
      val.forEach(function (item) {
        // Fish out the specific column data for each item in your data set and push it to the appropriate place.
        // Basically we're just building a multi-dimensional array here. If the data is _already_ in the right format you could
        // skip this loop...
        let row = [];

        row.push(item.Item);
        row.push(item.Quantity);
        row.push(item.Cost);
        
        vm.rows.push(row);
      });

      // Here's the magic to keeping the DataTable in sync.
      // It must be cleared, new rows added, then redrawn!
      vm.dtHandle.clear();
      vm.dtHandle.rows.add(vm.rows);
      vm.dtHandle.draw();
    }
  },
  mounted() {
    let vm = this;
    // Instantiate the datatable and store the reference to the instance in our dtHandle element.
    vm.dtHandle = $(this.$el).DataTable({
      // Specify whatever options you want, at a minimum these:
      columns: vm.headers,
      data: vm.rows,
      searching: true,
      paging: true,
      info: true
    });
  }  
});

var app =new Vue({
  el: '#app',
  data: {
    stationeries: [],
    search: ''
  },
  computed: {
    filteredstationeries: function () {
      let self = this
      let search = self.search.toLowerCase()
      return self.stationeries.filter(function (stationery) {
        return  stationery.Item.toLowerCase().indexOf(search) !== -1 
        /*||
          stationery.Quantity+"".indexOf(search) !== -1 ||
          stationery.Cost+"".indexOf(search) !== -1 */
      })
      
    }
  },
  mounted() {
    let vm = this;
    loadbatch()      
    
    // $.ajax({
    //   url: 'https://jsonplaceholder.typicode.com/stationeries',
    //   success(res) {
        
    //   }
    // });
  }
});

function loadbatch(){
    var commands = [];
    var batchExecutor = new RestBatchExecutor(_spPageContextInfo.webAbsoluteUrl, { 'X-RequestDigest': $('#__REQUESTDIGEST').val() });
    batchRequest = new BatchRequest();
    batchRequest.endpoint = lstUrl + "('Stationery Items')/items?$select=Id,Title,Cost,Quantity";
    batchRequest.headers = { 'accept': 'application/json;odata=nometadata' }
    commands.push({ id: batchExecutor.loadRequest(batchRequest), title: "Stationery" });
    batchRequest = new BatchRequest();
    // batchRequest.endpoint = lstUrl + "('Meeting Rooms')/items?$select=Id,Title";
    // batchRequest.headers = { 'accept': 'application/json;odata=nometadata' }
    // commands.push({ id: batchExecutor.loadRequest(batchRequest), title: "Meetings" });
    // batchRequest = new BatchRequest();
    // batchRequest.endpoint = lstUrl + "('Workplan')/items?$select=Title";
    // batchRequest.headers = { 'accept': 'application/json;odata=nometadata' }
    // commands.push({ id: batchExecutor.loadRequest(batchRequest), title: "Workplans" });

    batchExecutor.executeAsync().done(function (result) {
        $.each(result, function (k, v) {
            var command = $.grep(commands, function (command) {
                return v.id === command.id;
            });            
            if (command[0].title == "Stationery") {
                getStationery(v.result.result.value);
            } else if (command[0].title == "Meetings") {
                getMeetings(v.result.result.value);
            }else if (command[0].title == "Workplans") {
                getWorkplans(v.result.result.value);
            }           
        });     
    }).fail(function (err) {
        onError(err);
    });
}

function getStationery(d) {    
var stat=[];
    $.each(d, function (i, j) {
        stat.push({Item:j.Title,Quantity:j.Quantity,Cost:j.Cost});          
    });
    app.stationeries =stat;
}