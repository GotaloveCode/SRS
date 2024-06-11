Vue.component('v-select', VueSelect.VueSelect);
Vue.component('date-picker', VueBootstrapDatetimePicker.default);

Vue.component('data-table', {
  template: '<table class="table table-bordered"></table>',
  props: ['stationeries'],
  data() {
    return {
      headers: [
        { title: 'Title' },
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

        row.push(item.Title);
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
})
Vue.use(VeeValidate);
var tbstatus,tbreview,tbreport = null,awf_user={department:"",admin:false};
var lstUrl = _spPageContextInfo.webAbsoluteUrl + '/_api/web/lists/getbytitle';
var app = new Vue({
    el: '#app',
    data: {
        statuses:['Pending','Approved','Closed'],        
        Items:[],
        Workplans:[],
        MeetingsList:[],
        MyRequestList:[],
        req_ids:[],
        admin: false,
        review:false,
        btndel:false,
        reqForm:{delivery:"My Desk",requestdate:moment().format('DD-MM-YYYY'),meetingroom:"",workplan:null,itemList:[],},
        frmupdate:{Item:{Id:null,Cost:null,Quantity:null}},
        frmadd:{Item:"",Quantity:null,Cost:null},
        config: {format: 'DD-MM-YYYY'},
        wrap: {allowInputToggle: true},
        item:"",
        qty:"",
        fromdate:"",
        todate:"",
        rfrom:"",
        rto:""
    },
    methods:{
        updateStock(){
            this.$validator.validateAll('frmupdate').then((result) => {
                if (result) {
                    var id = this.frmupdate.Item.Id,title =this.frmupdate.Item.Title,quantity=this.frmupdate.Item.Quantity,cost=this.frmupdate.Item.Cost;
                    var item = {"__metadata": { "type": "SP.Data.Stationery_x0020_ItemsListItem"},"Title":title,"Quantity":quantity,"Cost":cost};
                    updateJson(lstUrl+"('Stationery Items')/items("+id+")", item, success, onError);
                    function success(data) {                        
                        swal("Stationery item updated successfully");
                        updateDataTable();                        
                        this.$nextTick(() => {this.errors.clear()});
                    }                 
                }
            }); 
        },
        addStock(){
            this.$validator.validateAll('frmadd').then((result) => {
                if (result) {
                    postStock();                 
                }
            }); 
        },
        postdeleteStock() {
            deleteStock();
        },
        submitRequest(){
            this.$validator.validateAll().then((result) => {
                if (result) {
                    postRequest();
                }
            });
        },
        addItem(){
            this.$validator.validateAll('form-1').then((result) => {
                if (result) {
                    this.reqForm.itemList.push({
                        Id:this.item.Id,
                        Item:this.item.Title,
                        Qty:this.qty
                    });                 
                }
            }); 
        },
        clearItem(){
            this.reqForm.workplan="";
            this.reqForm.itemList=[];
            //this.$validator.clean();
            this.$nextTick(() => {
              this.errors.clear();
            });
        },
        removeItem(index){
            this.reqForm.itemList.splice(index,1);
        },
        redrawStatus(){
            tbstatus._fnReDraw()
        },
        redrawReport(){
            tbreport._fnReDraw()
        },
    },
    mounted(){
        preload();
    }
});

function updateDataTable() {
  app.Items.push();
  app.frmupdate.Item={};
}

function preload(){
    RestCalls(lstUrl + "('Supervisor')/items?$select=SupervisorId&$filter=SupervisorId eq "+_spPageContextInfo.userId,
     "Get Dept rest call failed", function (d) {         
         $.each(d, function (i, j) {             
             if(j.SupervisorId)
                app.$data.admin=true;
         }); 
         loadbatch();       
     }); 
}

function loadbatch(){
    RestCalls("https://africanwildlife.sharepoint.com/_api/SP.UserProfiles.PeopleManager/GetMyProperties?$select=Department",
     "Get Dept rest call failed", function (d) {         
         $.each(d, function (i, j) {             
             awf_user.department = j.Department;
         });        
     });
    var commands = [];
    var batchExecutor = new RestBatchExecutor(_spPageContextInfo.webAbsoluteUrl, { 'X-RequestDigest': $('#__REQUESTDIGEST').val() });
    batchRequest = new BatchRequest();
    batchRequest.endpoint = lstUrl + "('Stationery Items')/items?$select=Id,Title,Cost,Quantity";
    batchRequest.headers = { 'accept': 'application/json;odata=nometadata' }
    commands.push({ id: batchExecutor.loadRequest(batchRequest), title: "Stationery" });
    batchRequest = new BatchRequest();
    batchRequest.endpoint = lstUrl + "('Meeting Rooms')/items?$select=Id,Title";
    batchRequest.headers = { 'accept': 'application/json;odata=nometadata' }
    commands.push({ id: batchExecutor.loadRequest(batchRequest), title: "Meetings" });
    batchRequest = new BatchRequest();
    batchRequest.endpoint = lstUrl + "('Workplan')/items?$select=Title";
    batchRequest.headers = { 'accept': 'application/json;odata=nometadata' }
    commands.push({ id: batchExecutor.loadRequest(batchRequest), title: "Workplans" });

    batchRequest.endpoint = lstUrl + "('Stationery Requests')/items?$select=Title,Quantity,Workplan,Date,Room,QueIdId,Created,Stationery/Title,Stationery/Cost,Author/Title&$expand=Stationery,Author&$filter=AuthorId eq "+_spPageContextInfo.userId;
    batchRequest.headers = { 'accept': 'application/json;odata=nometadata' }
    commands.push({ id: batchExecutor.loadRequest(batchRequest), title: "AllRequests" }); 

    batchRequest = new BatchRequest();
    batchRequest.endpoint = lstUrl + "('RequestQueue')/items?$select=Id,Status,Created,AuthorId&$filter=AuthorId eq "+_spPageContextInfo.userId;
    batchRequest.headers = { 'accept': 'application/json;odata=nometadata' }
    commands.push({ id: batchExecutor.loadRequest(batchRequest), title: "RequestQueue" });

    batchRequest = new BatchRequest();
    batchRequest.endpoint = lstUrl + "('RequestQueue')/items?$select=Id,Status,Created,Author/Title&$expand=Author";
    batchRequest.headers = { 'accept': 'application/json;odata=nometadata' }
    commands.push({ id: batchExecutor.loadRequest(batchRequest), title: "AdminRequestQueue" });


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
            } else if (command[0].title == "AllRequests") {
                getAllRequests(v.result.result.value);
            }else if (command[0].title == "RequestQueue") {
                getRequestQueue(v.result.result.value);
            }else if (command[0].title == "AdminRequestQueue") {
                getAdminRequestQueue(v.result.result.value);
            }           
        });     
    }).fail(function (err) {
        onError(err);
    });
}

function getAllRequests(d) {
    var authors=[],row = ""; 
    $.each(d, function (i, j) {
        row+='<tr><td>'+moment(j.Created).format("DD-MM-YYYY")+'</td><td>'+j.Author.Title+'</td><td>'+j.Stationery.Title+'</td><td>'+j.Quantity+'</td><td>'+j.Stationery.Cost+
        '</td><td>'+j.Workplan+'</td><td>'+j.Title+'</td><td>'+moment(j.Date).format("DD-MM-YYYY")+'</td><td>'+(j.Room ? j.Room : "")+'</td></tr>';
        authors.push(j.Author.Title);
    });   
    authors =$.unique(authors); 
    var o ="";
    $.each(authors,function(i,j){
        o+="<option>"+j+"</option>";
    });
    $("#selRequestedby").html(o).chosen({ width: '100%' });    
    $('#tbreport>tbody').html(row);  
    tbreport=$("#tbreport").dataTable({responsive:true});
}

function getAdminRequestQueue(d) {
    var row = ""; 
    $.each(d, function (i, j) {
        row+='<tr data-id="'+j.Id+'">=<td>'+j.Author.Title+'</td><td>'+moment(j.Created).format("DD-MM-YYYY")+'</td><td>'+j.Status+'</td><td><a href="#" data-id="'+j.Id+'" data-view="review" data-status="'+j.Status+'" class="btn que '+(j.Status=="Pending" ? "btn-success" : "btn-default")+'" class="btn btn-success">'+ (j.Status=="Pending" ? "Review" : "View") +'</a></td></tr>';
    }); 
    $('#tbreview>tbody').html(row);
    tbreview=$('#tbreview').dataTable({responsive:true});  
}

function getRequestQueue(d) {
    var row = ""; 
    var c = 1;
    $.each(d, function (i, j) {
        row+='<tr><td>'+c+'</td><td>'+moment(j.Created).format("DD-MM-YYYY")+'</td><td>'+j.Status+'</td><td><a href="#" data-id="'+j.Id+'" data-view="status" data-status="'+j.Status+'" class="btn que btn-success">View</a></td></tr>';
        c++;
    }); 
    $('#tbstatus>tbody').html(row);  
    tbstatus = $('#tbstatus').dataTable({responsive:true});
}


function getStationery(d) {
    var stationery =[];
    $.each(d, function (i, j) {
        app.$data.Items.push({Id:j.Id,Title:j.Title,Quantity:j.Quantity,Cost:j.Cost});          
    });   
}

function getMeetings(d) {
    $.each(d, function (i, j) {
        app.$data.MeetingsList.push(j.Title);          
    });   
}

function getWorkplans(d) {
    var o="";
    $.each(d, function (i, j) {
        app.$data.Workplans.push(j.Title);
        o+="<option>"+j.Title+"</option>";
    }); 
    $("#selworkplan").html(o).chosen({ width: '100%' });  
}



function createListItems(reqid) {    
    var itemArray = [];
    var clientContext = SP.ClientContext.get_current();
    var oList = clientContext.get_web().get_lists().getByTitle('Stationery Requests');
    let postData = app.$data.reqForm;
    var iList = postData.itemList;
    
    for(var i = 0; i< iList.length; i++){    
        var itemCreateInfo = new SP.ListItemCreationInformation();
        var oListItem = oList.addItem(itemCreateInfo); 
        
        if(postData.delivery == "Meeting Room"){
            oListItem.set_item('Date', moment(postData.requestdate,"DD-MM-YYYY").toISOString());
            oListItem.set_item('Room', postData.meetingroom);
        }
        oListItem.set_item('Title', postData.delivery);
        oListItem.set_item('Stationery', iList[i].Id); 
        oListItem.set_item('Quantity', parseInt(iList[i].Qty));
        oListItem.set_item('Status', "Pending"); 
        oListItem.set_item('Workplan', postData.workplan); 
        oListItem.set_item('QueId', reqid);
        oListItem.set_item('Department', awf_user.department);
        oListItem.update();
        itemArray[i] = oListItem;
        clientContext.load(itemArray[i]);
    }
    
    clientContext.executeQueryAsync(onQuerySucceeded, onQueryFailed);
    function onQuerySucceeded() {
        swal("Success!", "Stationery Request Successful", "success");
         for(var i = 0; i< iList.length; i++){
            app.$data.MyRequestList.push({
                Title:iList[i].Item,
                Quantity:iList[i].Qty,
                Status:"Pending",
                Created:moment().format("DD-MM-YYYY"),
                Workplan:postData.workplan,
                Room:postData.meetingroom,
                Date:postData.requestdate,
                Department:awf_user.department,
                ReqId:reqid
            });          
        }
        app.clearItem();
    }
    
    function onQueryFailed(sender, args) {
        swal("Request failed", args.get_message(), "error");
        app.clearItem();
    }
}

$.fn.dataTable.ext.search.push(
    function( settings, data, dataIndex ) {
    if (settings.nTable.id != "tbstatus") return true;
        date_from = moment('01-01-1000','DD-MM-YYYY');
        the_date = moment().format('DD-MM-YYYY');
        date_to = moment().endOf('year');       
        
        if($('#date-from').val() != ""){
            date_from = moment($('#date-from').val(),'DD-MM-YYYY');
        }           
        if($('#date-to').val() != ""){
            date_to = moment($('#date-to').val(),'DD-MM-YYYY');
        }                  
        if(data[1] != ""){
            the_date = data[1];
        }        
        var loc = moment(the_date,'DD-MM-YYYY');
        
        if (loc.isSameOrAfter(date_from) && loc.isSameOrBefore(date_to))
        {
            return true;
        }
        return false;
    }
);

$.fn.dataTable.ext.search.push(
    function( settings, data, dataIndex ) {
    if (settings.nTable.id != "tbstatus") return true;
        var value = $('#selstatus').val();
        var d = data[2];
        if (value == null)
        {
            return true;
        }
        else if(value.indexOf(d) != -1){
            return true;
        }
        return false;
    }
);


$.fn.dataTable.ext.search.push(
    function( settings, data, dataIndex ) {
    if (settings.nTable.id != "tbreport") return true;
        date_from = moment('01-01-1000','DD-MM-YYYY');
        the_date = moment().format('DD-MM-YYYY');
        date_to = moment().endOf('year');       
        
        if($('#rptdate-from').val() != ""){
            date_from = moment($('#rptdate-from').val(),'DD-MM-YYYY');
        }           
        if($('#rptdate-to').val() != ""){
            date_to = moment($('#rptdate-to').val(),'DD-MM-YYYY');
        }                  
        if(data[0] != "") the_date = data[0];                
        var loc = moment(the_date,'DD-MM-YYYY');
        
        if (loc.isSameOrAfter(date_from) && loc.isSameOrBefore(date_to))
        {
            return true;
        }
        return false;
    }
);

$.fn.dataTable.ext.search.push(
    function( settings, data, dataIndex ) {
    if (settings.nTable.id != "tbreport") return true;
        var value = $('#selworkplan').val();
        var d = data[5];
        if (value == null)return true;        
        else if(value.indexOf(d) != -1) return true;        
        return false;
    }
);

$.fn.dataTable.ext.search.push(
    function( settings, data, dataIndex ) {
    if (settings.nTable.id != "tbreport") return true;
        var value = $('#selRequestedby').val();
        var d = data[1];
        if (value == null)
        {
            return true;
        }
        else if(value.indexOf(d) != -1){
            return true;
        }
        return false;
    }
);


$(document).ready(function () {  
    $(".chosen").chosen({ width: '100%' });
    $('#selstatus').change(function(e){ tbstatus._fnReDraw()});
    $('#selworkplan').change(function(e){ tbreport._fnReDraw()});
    $('#selRequestedby').change(function(e){ tbreport._fnReDraw()});
    $("#itemModal").on("hidden.bs.modal", function () {
        $('#statlist>tbody').html('');
        $('#approveid').val('');
    });    
    $("body").on("click",".que",function() {getStationeryList($(this));});
    $("body").on("click","#btnapprove",function(){
        approve();
    });
    UpdateFormDigest(_spPageContextInfo.webServerRelativeUrl, _spFormDigestRefreshInterval);
});

 function postRequest() {
  var item = {"__metadata": { "type": "SP.Data.RequestQueueListItem"},"Title":new Date().toLocaleString() };
  postJson(lstUrl+"('RequestQueue')/items/", item, success, onError);

    function success(data) {
        createListItems(data.d.Id);                
    }
 }

 function postStock() {
  var item = {"__metadata": { "type": "SP.Data.Stationery_x0020_ItemsListItem"},"Title":app.frmadd.Item,"Quantity":app.frmadd.Quantity,"Cost":app.frmadd.Cost};
  postJson(lstUrl+"('Stationery Items')/items/", item, success, onError);
    function success(data) {
        app.$data.Items.push({Id:data.d.Id,Title:app.frmadd.Item,Quantity:app.frmadd.Quantity,Cost:app.frmadd.Cost}); 
        swal("Stationery item added successfully");
        app.frmadd.Item="";app.frmadd.Quantity="";app.frmadd.Cost="";
    }
 }

function deleteStock() {
    if($("#approveid").val() ==""){
        swal("Failed to fetch stock item to delete");
        return;
    }
    var batchExecutor = new RestBatchExecutor(_spPageContextInfo.webAbsoluteUrl, { 'X-RequestDigest': $('#__REQUESTDIGEST').val() });
    var commands = [];
    batchRequest = new BatchRequest();
    batchRequest.endpoint = lstUrl + "('RequestQueue')/items(" + $("#approveid").val() + ")";
    batchRequest.headers = { 'IF-MATCH': "*" };
    batchRequest.verb = "DELETE";
    commands.push({ id: batchExecutor.loadChangeRequest(batchRequest), title: 'deleteReqQue' });
    app.$data.req_ids.forEach(function (id) {
        batchRequest = new BatchRequest();
        batchRequest.endpoint = lstUrl + "('Stationery Requests')/items(" + id + ")";
        batchRequest.headers = { 'IF-MATCH': "*" };
        batchRequest.verb = "DELETE";
        commands.push({ id: batchExecutor.loadChangeRequest(batchRequest), title: 'deleteStats'+id });
    });
    batchExecutor.executeAsync().done(function (result) {            
            var command = $.grep(commands, function (command) {
                return v.id === command.id;
            });            
            if (command[0].title == "deleteReqQue") {
               swal({
                title: "Success",
                type: "success",
                text: "Stationery request deleted successfully.Do you want to refresh this page?",
                showCancelButton: true,
                },function(isConfirm){ 
                    if (isConfirm) location.reload(); 
                    else $('#itemModal').modal('hide')
                });
            }
    });
 
 }

 
function postJson(endpointUri, payload, success, error) {
    UpdateFormDigest(_spPageContextInfo.webServerRelativeUrl, this._spFormDigestRefreshInterval);
    $.ajax({
        url: endpointUri,
        type: "POST",
        data: JSON.stringify(payload),
        contentType: "application/json;odata=verbose",
        headers: { "Accept": "application/json;odata=verbose", "X-RequestDigest": $("#__REQUESTDIGEST").val() },
        success: success,
        error: onError
    });
}

function updateJson(endpointUri, payload, success, error) {
UpdateFormDigest(_spPageContextInfo.webServerRelativeUrl, this._spFormDigestRefreshInterval);
    $.ajax({
        url: endpointUri,
        type: "POST",
        data: JSON.stringify(payload),
        contentType: "application/json;odata=verbose",
        headers: {
            "Accept": "application/json;odata=verbose","X-RequestDigest": $("#__REQUESTDIGEST").val(),
            "X-HTTP-Method": "MERGE","If-Match": "*"
        },
        success: success,
        error: onError
    });
}

function onError(e) {
    console.log(e);
    console.log("1 error:" +e.responseText);
    swal("Error",e.responseText,"error");
}

function RestCalls(Myurl, error, f) {
    UpdateFormDigest(_spPageContextInfo.webServerRelativeUrl, this._spFormDigestRefreshInterval);
    $.ajax({
        url: Myurl,
        method: "GET",
        headers: {"Accept": "application/json; odata=verbose"},
        success: function (data) {f(data.d.results) },
        error: onError
    })
}

function getStationeryList(e){
    $("#approveid").val(e.data('id'));
    console.log(e.data('id'));
    $('#btnapprove').hide();
    $('#itemModal').modal('show'); 
    if(e.data('status')=="Pending" && e.data('view')=="status")
        app.$data.btndel =true;
    else
        app.$data.btndel =false;

    if(e.data('view')=="status"){
        app.$data.review = false;
    }else{
        if(app.$data.admin && e.data('status')=="Pending"){
            app.$data.review = true; 
        }else{
            app.$data.review = false;
        }
    }
    RestCalls(lstUrl+"('Stationery Requests')/items?$select=Id,Stationery/Id,Stationery/Title,Quantity,Stationery/Quantity,Workplan,Date,Room&$expand=Stationery&$filter=QueIdId eq "+e.data('id'),
     "Get Statlist rest call failed", function (d) {
    var row = "",c = 1;
    app.$data.req_ids=[];         
         $.each(d, function (i, j) {  
            app.$data.req_ids.push(j.Id);
            row+='<tr data-id="'+j.Stationery.Id+'" data-qty="'+j.Quantity+'"><td>'+c+'</td><td>'+j.Stationery.Title+'</td><td class="'+(j.Quantity>j.Stationery.Quantity ? 'danger' : 'success')+'">'+j.Quantity+'</td>';
            if(app.$data.admin) row+='<td>'+j.Stationery.Quantity+'</td>';
             row+='<td>'+j.Workplan+'</td><td>'+(j.Room ? moment(j.Date).format("DD-MM-YYYY") : "")+'</td><td>'+(j.Room ? j.Room :"Desk")+'</td></tr>';
            c++;
         });            
         $('#statlist>tbody').html(row);
         $('.sk-cube-grid').hide(); 
         $('#itemModal table,#btnapprove').show();
     });         
}

function approve(){
    var id = $("#approveid").val();
    var item = {"__metadata": { "type": "SP.Data.RequestQueueListItem"},"Status":"Approved"};
    updateJson(lstUrl+"('RequestQueue')/items(" + id + ")",item,requestApproved,onError);
    function requestApproved(){ 
        $("#approveid").val('');
        bulkUpdateQuantity();
    }
}

function bulkUpdateQuantity(){
    var ids =[];
    var qtys= [];
    $('#statlist>tbody tr').each(function() {
          ids.push($(this).data('id'));
          qtys.push($(this).data('qty'));
    });
    var listItemToBeUpdated = "";
    var ctx = SP.ClientContext.get_current();
    var list = ctx.get_web().get_lists().getByTitle('Stationery Items');
    var query = new SP.CamlQuery();

    var q = "<View><Query><Where><In><FieldRef Name='ID'/><Values>";
    ids.forEach(function (id) {
        q += "<Value Type='Number'>" + id + "</Value>";
    });
    q += "</Values></In></Where></Query></View>";
    query.set_viewXml(q);
    var results = list.getItems(query);    
    ctx.load(results, 'Include(Id, Quantity)');    
    ctx.executeQueryAsync(getItemsToBeUpdatedSuccess, onQueryFailed);

    function getItemsToBeUpdatedSuccess() {
        listItemToBeUpdated = results.getEnumerator();
        updateMultipleListItems();
    }
    
    function onQueryFailed(sender, args) {
        swal("Request failed", args.get_message(), "error");
        app.clearItem();
    }

    function updateMultipleListItems() 
    {   
        var itemArray = [];
        var clientContext = SP.ClientContext.get_current();
        var oList = clientContext.get_web().get_lists().getByTitle('Stationery Items');
         var i=0;
         while(listItemToBeUpdated.moveNext())
         {
            var oItem = listItemToBeUpdated.get_current();
            var oListItem = oList.getItemById(oItem.get_id());
            var qty = oItem.get_item("Quantity");
            qty = qty - qtys[i];
            oListItem.set_item('Quantity', qty);  
            oListItem.update();
            itemArray.push(oListItem);
            clientContext.load(itemArray[itemArray.length-1]);
            i++;
           
         }  
        clientContext.executeQueryAsync(updateMultipleListItemsSuccess, onError);
    }

    function updateMultipleListItemsSuccess() {
        swal({
        title: "Success",
        type: "success",
        text: "Request approved successfully.Do you want to refresh this page?",
        showCancelButton: true,
        },function(isConfirm){ if (isConfirm) location.reload(); else $('#itemModal').modal('hide')});    
   }
}

function loadDocFrames(url) {
    $('.main-loader').show();
    iframe(_spPageContextInfo.webAbsoluteUrl + url, '#documents-iframe', '560px');
}   

function iframe(url, selector, height) {
    $(selector).empty();
    $('<iframe>', {
        src: url,
        id: 'MainIframe',
        'class': 'MainIframe',
        frameborder: 0,
        height: height,
        scrolling: "no",
        width: '100%'
    }).appendTo(selector);
    $('.MainIframe').load(function () {
        $('.main-loader').hide();
        $('.MainIframe').contents().find('body').addClass('ms-fullscreenmode');
        setTimeout(hideFrame, 3000);       
    });
    function hideFrame(){
        $('.MainIframe').contents().find('.od-SuiteNav,.Files-leftNav,.od-TopBar-header.od-Files-header,.footer').hide().css('display', 'none');
        $('.MainIframe').contents().find('.Files-mainColumn').css('left', '0');
        $('.MainIframe').contents().find('.Files-belowSuiteNav').css('top', '0px');
    }
}
