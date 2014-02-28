var barTemplate = '<div class="bar" style="height: {{height}}%; width: 80px;"><div class="numEvents">{{numEvents}}</div><div class="eventName" style="width: 80px;">{{eventName}}</div></div>';
var spaceTemplate = '<div class="space"><div class="conversion">{{conversion}}%</div></div>';
var stepTemplate ='<div class="step-container cf"><div class="step-index">Step {{index}}</div>{{> eventType}}</div>';
var showMeTemplate = '<div class="show-me">Show me people who did &nbsp {{> eventType}} &nbsp then came back and did &nbsp {{> eventType}}';
var eventTypeTemplate = '<select class="selectpicker" name="events">\n{{#eventTypes}}<option value="{{.}}">{{.}}</option>{{/eventTypes}}\n</select>'

//===============================================================================

$(document).ready(function() {
    bindNavBar();

    var params = document.location.search;

    if (params.indexOf('type=retention') > -1) {
        $('.nav-retention').click();
        initRetentionShow();
    } else {
        $('.nav-funnel').click();
        if (params.indexOf('type=funnel') > -1) {
            initFunnelShow();
        } else {
            initFunnelCreate();
        }
    }
});

function bindNavBar() {
   $('.nav li').click(function () {
       $('.nav li').removeClass('active');
       $(this).addClass('active');
   })
   $('.nav-funnel').click(function () {
       initFunnelCreate();
   });
   $('.nav-retention').click(function () {
       initRetentionShow();
   });
}

//===============================================================================

function initRetentionShow() {
    $('.frame').removeClass('show');
    $('.retention-show').addClass('show');
    $('.container').removeClass('small');

    initializeRetentionDatePickers();
    initializeRetentionEventType();

    var a = [
      [1,2,3],
      [4,5,6],
      [7,8,9]
    ];

    var count = 0;
    for (var i = 0; i < a.length; i++) {
       $('.retention').append('<div class="row' + i + '"></div>');
       $('.axis').append('<div>' + i + '</div>');
       for (var j = 0; j < a[i].length; j++) {
         $('.row' + i).append('<div class="box">' + a[i][j] + '</div>');
       }
    }
}

function initializeRetentionDatePickers() {
    $( "#retentionStartDate" ).datepicker().val('01/01/2013');
    $( "#retentionEndDate" ).datepicker().val('01/30/2013');
}

function initializeRetentionEventType() {
    getEventTypes(function(eventTypes) {
        var view = { eventTypes: JSON.parse(eventTypes) };
        var partials = { "eventType": eventTypeTemplate };
        $('.eventType-container').html(Mustache.render(showMeTemplate, view, partials));
        $('.selectpicker').selectpicker('render');
    });
}

//===============================================================================

function initFunnelCreate() {
    $('.frame').removeClass('show');
    $('.funnel-create').addClass('show');
    $('.container').addClass('small');

    getEventTypes(function(eventTypes) {
        initializeSteps(eventTypes);
        $('.add-step').off().click(function (e) {
            e.preventDefault();
            addStep(eventTypes);
        });
    });

    $('input[type="submit"]').click(function(e){
        e.preventDefault();
        var steps =  $('select[name="events"]').map(function(i, el) {
            return $(el).val();
        });
        var funnel = {
            name: $('input[name="name"]').val(),
            steps: steps.toArray(),
            type: 'funnel'
        }
        window.location.href = '?' + $.param(funnel);
    });
}


var index = 1;
function addStep(eventTypes) {
    var view = {
        eventTypes: JSON.parse(eventTypes),
        index: index++
    };
    var partials = { "eventType": eventTypeTemplate };
    $('.steps').append(Mustache.render(stepTemplate, view, partials));
    $('.selectpicker').selectpicker('render');
}

function initializeSteps(eventTypes) {
    index = 1;
    $('.steps').empty();
    for (var i = 0; i < 3; i++) {
        addStep(eventTypes);
    }
}

//===============================================================================

function initFunnelShow() {
    $('.frame').removeClass('show');
    $('.funnel-show').addClass('show');
    $('.container').removeClass('small');
    var funnel = $.deparam(window.location.search.substring(1));
    initializeFunnelDatePickers();
    getFunnel(funnel);
}

function getFunnel(funnel) {
    $.ajax({
      type: "GET",
      url: "http://localhost:8080/events/funnel",
      data: {
        start_date: formatDate($('#funnelStartDate').val()),
        end_date: formatDate($('#funnelEndDate').val()),
        funnel_steps: funnel.steps,
        num_days_to_complete_funnel: $('input[name="days"]').val(),
        eck: "event_property_1",
        ecv: 1
      }
    }).done(function(eventVolumes) {
        eventVolumes = JSON.parse(eventVolumes);
        renderCompletionRate(eventVolumes);
        renderFunnelGraph(funnel, eventVolumes);
        bindInputListeners(funnel);
        renderFunnelName(funnel);
    });
}

function renderFunnelName(funnel) {
    $('.funnel-name').text(funnel.name || 'Unnamed funnel');
}

function bindInputListeners(funnel) {
    $('input').change(function () {
        getFunnel(funnel);
    });
}

function initializeFunnelDatePickers() {
    $( "#funnelStartDate" ).datepicker().val('01/01/2013');
    $( "#funnelEndDate" ).datepicker().val('01/30/2013');
}

function renderCompletionRate(eventVolumes) {
    var eventLength = eventVolumes.length;
    var completionRate = (eventVolumes[eventLength - 1] / eventVolumes[0] * 100).toFixed(2);
    $('.completion-rate').text(completionRate + '% Completion Rate');
}

function renderFunnelGraph(funnel, eventVolumes) {
    $('.graph').empty();
    var maxEventVolume = Math.max.apply(Math, eventVolumes);
    var diviser = Math.pow(10, (maxEventVolume.toString().length - 2));
    var Y_AXIS_MAX = Math.ceil(maxEventVolume / diviser) * diviser;

    $('.y-value').each(function (i, el) {
        $(el).text(parseInt(Y_AXIS_MAX / 6 * (i + 1), 10));
    });

    var previousVolume;
    eventVolumes.forEach(function (v, i) {
        if (i > 0) {
            view = {
                conversion: (v / previousVolume * 100).toFixed(2)
            };
            $('.graph').append(Mustache.render(spaceTemplate, view));
        }
        var view = {
            height: (v / Y_AXIS_MAX * 100),
            numEvents: v,
            eventName: funnel.steps[i]
        };
        previousVolume = v;
        $('.graph').append(Mustache.render(barTemplate, view));
    });
}

//===============================================================================

function getEventTypes(cb) {
    $.ajax({
      type: "GET",
      url: "http://localhost:8080/events/types",
    }).done(cb);
}

function formatDate(date) {
    date = date.split('/');
    return date[2] + date[0] + date[1];
}