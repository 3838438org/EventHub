var stepTemplate ='<div><select name="events">\n{{#events}}<option value="{{.}}">{{.}}</option>{{/events}}\n</select></div>';

var mockObj = {
    events: ['Event1', 'Event2', 'Event3']
};

$(document).ready(function () {
    addStep();
	$('.add-step').click(function (e) {
		e.preventDefault();
		addStep();
	});
});

var view = {
    events: mockObj.events
};
function addStep() {
    $('.steps').append(Mustache.render(stepTemplate, view));
}