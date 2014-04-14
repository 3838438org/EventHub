function initFunnelShow() {
  $('.body-container').html(Mustache.render(funnelTemplate));

  $('.frame').removeClass('show');
  $('.funnel-show').addClass('show');

  var params = $.deparam(window.location.search.substring(1));
  var funnel = params.type === 'funnel' ? params : {};

  initializeFunnelSteps(funnel);
  initializeFunnelDatePickers(funnel);
  initializeDaysToComplete(funnel)
  bindFunnelInputListeners();
  bindRemoveStepListener();
}

function getFunnel() {
  var funnel = {
    start_date: formatDate($('#funnelStartDate').val()),
    end_date: formatDate($('#funnelEndDate').val()),
    funnel_steps: getFunnelSteps(),
    num_days_to_complete_funnel: $('input[name="days"]').val(),
    type: 'funnel'
  };

  $('.step-container').each(function(i, step) {
    var filterValue = $(step).find('select[name="filterValue"]');
    if (filterValue.length) {
      funnel["efv" + i] = $(filterValue).val();
      funnel["efk" + i] = $(step).find('select[name="filterKey"]').val();
    }
  })

  window.history.replaceState({}, '', '/?' + $.param(funnel));
  $.ajax({
    type: "GET",
    url: "/events/funnel",
    data: funnel
  }).done(function(eventVolumes) {
    eventVolumes = JSON.parse(eventVolumes);
    renderCompletionRate(eventVolumes);
    renderFunnelGraph(eventVolumes);
  });
}

function getFunnelSteps() {
  var funnelSteps = $('.funnel-steps select[name="events"]').map(function(i, el) {
    return $(el).val();
  }).toArray();
  return funnelSteps;
}

function bindFunnelAddFiltersListener() {
  $('.funnel-filters-toggle').click(function () {
    $(this).addClass('hide');
    $('.funnel-steps').addClass('show-filters');
    bindFunnelFilterKeyListeners();
  });
}

function bindAddStepListener() {
  $('.add-step').off().click(function () {
    addStep();
  });
}

function bindRemoveStepListener() {
  $(document.body).off().on('click', '.remove-step', function () {
    $('.add-step').css('display', 'inline-block');
    $(this).parent().remove();
  });
}

function bindFunnelInputListeners() {
  $('.calculate-funnel').off().click(function () {
    $('.funnel-inputs .spinner').addClass('rendered');
    getFunnel();
  });
}

function bindFunnelFilterKeyListeners() {
  $('select[name="filterKey"]').off().change(function () {
    $(this).parent().find('.filter-value').remove();
    if ($(this).val() !== 'no filter') {
      renderFunnelValueFilter($(this));
    }
  });
}

function bindFunnelEventListeners() {
  $('select[name="events"]').change(function () {
    $(this).parent().find('.filters').remove();
    var view = {
      filterKeys: ['no filter'].concat(EVENT_TYPE_KEYS[$(this).val()])
    };
    $(this).parent().append(Mustache.render(filterKeyTemplate, view));
    $('.selectpicker').selectpicker('render');
    bindFunnelFilterKeyListeners();
  });
}

function addStep() {
  view = {
    eventTypes: EVENT_TYPES,
    filterKeys: ['no filter'].concat(EVENT_TYPE_KEYS[EVENT_TYPES[0]]),
  };
  var partials = {
    "eventType": eventTypeTemplate,
    "filters": filterKeyTemplate
  };
  $('.steps-container').append(Mustache.render(stepTemplate, view, partials));
  $('.selectpicker').selectpicker('render');
  bindFunnelEventListeners();
  if ($('.step-container').length === 5) $('.add-step').css('display', 'none');
}

function initializeFunnelSteps(funnel) {
  $('.steps-container').empty();
  $('.add-step').remove();
  getEventTypes(function (eventTypes) {
    EVENT_TYPES = JSON.parse(eventTypes);
    getEventKeys(function () {
      funnel.steps = funnel.funnel_steps || [EVENT_TYPES[0], EVENT_TYPES[1]];
      funnel.steps.forEach(function (v, i) {
        addStep();
        $('.funnel-show select').last().val(v);
        $('.funnel-show select').selectpicker('refresh');
      });
      renderAddFunnelStep();
      bindAddStepListener();
      bindFunnelAddFiltersListener();
    });
  });
}

function initializeDaysToComplete(funnel) {
  $('#daysToComplete').val(funnel.num_days_to_complete_funnel || 7);
}

function initializeFunnelDatePickers(funnel) {
  var start_date = funnel.start_date ? unFormatDate(funnel.start_date) : '01/01/2013';
  var end_date = funnel.end_date ? unFormatDate(funnel.end_date) : '01/30/2013';
  $( "#funnelStartDate" ).datepicker().on('changeDate', function () { $(this).datepicker('hide'); })
                                      .datepicker('setValue', start_date);
  $( "#funnelEndDate" ).datepicker().on('changeDate', function () { $(this).datepicker('hide'); })
                                    .datepicker('setValue', end_date);
}

function renderFunnelValueFilter($keyFilter) {
  var params = {
    event_type: $keyFilter.parent().parent().find('select[name="events"]').val(),
    event_key: $keyFilter.val()
  }
  $.ajax({
    type: "GET",
    url: "/events/values?" + $.param(params)
  }).done(function(values) {
    values = JSON.parse(values);
    var view = {
      filterValues: values
    };
    $keyFilter.parent().append(Mustache.render(filterValueTemplate, view));
    $('.selectpicker').selectpicker('render');
  });
}

function renderAddFunnelStep() {
  $('.funnel-steps').append(Mustache.render(addStepTemplate));
}

function renderCompletionRate(eventVolumes) {
  var eventLength = eventVolumes.length;
  var completionRate = (eventVolumes[eventLength - 1] / eventVolumes[0] * 100).toFixed(2);
  $('.completion-rate').html('<span style="font-weight: bold">' + completionRate + '%</span> Completion Rate');
}

function renderFunnelGraph(eventVolumes) {
  $('.middle').addClass('rendered');
  $('.graph').empty();
  var maxEventVolume = Math.max.apply(Math, eventVolumes);
  var diviser = Math.pow(10, (maxEventVolume.toString().length - 2));
  var Y_AXIS_MAX = Math.ceil(maxEventVolume / diviser) * diviser;

  $('.y-value').each(function (i, el) {
      $(el).text(parseInt(Y_AXIS_MAX / 6 * (i + 1), 10));
  });

  var funnelSteps = getFunnelSteps();
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
          eventName: funnelSteps[i]
      };
      previousVolume = v;
      $('.graph').append(Mustache.render(barTemplate, view));
  });

  $('.funnel-inputs .spinner').removeClass('rendered');
}
