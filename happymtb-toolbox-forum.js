var storage = chrome.storage.sync;
var remove_queue = [];

function loaded(){
  storage.get('forum_filter_rules', function(data){
    var rules = []
    if(data.hasOwnProperty('forum_filter_rules')){
      rules = data.forum_filter_rules;
    }
    applyFilter(rules);
  });
}

function applyFilter(rules){
  var hidden_thread_count = 0;
  $('.PhorumStdTable tr').each(function(i, e){
    var element = $(e).children('td').first();
    var a = element.children('a').first();
    var url = a.attr('href');
    var title = a.text();
    
    var started_by_td = $(e).children('td')[2];
    var user_a = $(started_by_td).children('a').first();
    var user_url = user_a.attr('href');
    var user_name = user_a.text();
    
    var thread = {
      'title': title,
      'url': url,
      'user': {
        'name': user_name,
        'url': user_url
      }
    };

    if(matches_rule(thread, rules)){
      hidden_thread_count++;
      $(e).remove();
      //$(e).css('visibility', 'hidden');
    } else {
      if($(e).find('#hide_thread, #hide_user').length == 0){
        var hide = $('<i id="hide_thread" class="icon-collapse-alt"></i>');
        var hide2 = $('<i id="hide_user" class="icon-collapse-alt" style="margin-right:5px"></i> ');
        hide.click(function(){
          applyFilter([{'thread': thread}]); // Hack, can not call loaded
          addRule({'thread': thread}, updateRuleTable);
        });
        hide2.click(function(){
          applyFilter([{'started_by': thread.user}]); // Hack
          addRule({'started_by': thread.user}, updateRuleTable);
        });
        element.prepend(hide);
        $(started_by_td).prepend(hide2);
      }
    }
  }).promise().done(function(){
    $('#hidden_threads').text(hidden_thread_count);
    $('.PhorumStdTable tbody tr:nth-child(even) td').addClass('PhorumTableRow').removeClass('PhorumTableRowAlt');
    $('.PhorumStdTable tbody tr:nth-child(odd) td').addClass('PhorumTableRowAlt').removeClass('PhorumTableRow');
  });
}

function matches_rule(thread, rules){
  return rules.some(function(rule){
    if(rule.hasOwnProperty('title_contains')){
      return thread.title.indexOf(rule.title_contains) > -1;
    } else if (rule.hasOwnProperty('started_by')){
      if(rule.started_by.hasOwnProperty('url')){
        return (thread.user.url == rule.started_by.url);
      } else {
        return (thread.user.name == rule.started_by.name);
      }
    } else if (rule.hasOwnProperty('thread')){
      return (thread.url == rule.thread.url);
    } else {
      console.warn('unknown rule', rule);
      return false;
    }
  });
}

function addRule(rule, callback){
  storage.get('forum_filter_rules', function(data){
    var rules = []
    if(data.hasOwnProperty('forum_filter_rules')){
      rules = data.forum_filter_rules;
    }
    rules.push(rule);
    storage.set({'forum_filter_rules': rules}, function(){
      if (callback && typeof(callback) === "function") {
        callback.call();
      }
    });
  });
}

function removeRules(rules, callback){
  storage.get('forum_filter_rules', function(data){
    if(data.hasOwnProperty('forum_filter_rules')){
      var saved_rules = data.forum_filter_rules;
      var updated_rules = saved_rules.filter(function(saved_rule){
        return !rules.some(function(rule){
          return _.isEqual(rule, saved_rule);
        });
      });
      storage.set({'forum_filter_rules': updated_rules}, callback);
    }
  });
}

function updateRuleTable(){
  var tb = $('#rule-table tbody');
  tb.children('tr').remove();
  storage.get('forum_filter_rules', function(data){
    if(data.hasOwnProperty('forum_filter_rules')){
      var tr = '';
      var rules = data.forum_filter_rules;
      rules.forEach(function(rule){
        if(rule.hasOwnProperty('title_contains')){
          tr = $('<tr><td>'+ 'Titel innehåller' +'</td><td>'+ rule.title_contains +'</td></tr>');
        } else if (rule.hasOwnProperty('started_by')){
          tr = $('<tr><td>'+ 'Startad av' +'</td><td><a href="'+ rule.started_by.url + '">'+ rule.started_by.name +'</a></td></tr>');
        } else if (rule.hasOwnProperty('thread')){
          tr = $('<tr><td>'+ 'Tråd' +'</td><td><a href="'+ rule.thread.url +'">'+ rule.thread.title +'</td></tr>');
        } else {
          console.warn('unknown rule', rule);
        }
        tr.data('rule', rule);
        remove_button = $('<button type="button" data-toggle="button" class="btn btn-danger btn-xs">Ta bort</button>');
        remove_button.click(function(){
          this_rule = $(this).closest('tr').data('rule');
          rule_index = remove_queue.indexOf(this_rule);
          if(rule_index == -1){
            remove_queue.push(this_rule);
          } else {
            remove_queue.splice(rule_index, 1);
          }
        });
        td = $('<td></td>').html(remove_button);
        tr.append(td);
        tb.append(tr);
      });
    }
  });
}

$.ajax({
  'url': chrome.extension.getURL("settings.html")
}).done(function(data){
  var settings = $(data);
  settings.css('position', 'absolute');
  settings.css('top', '0px');
  settings.css('right', '0px');
  $('body').append(settings);
  loaded();
});

$.ajax({
  'url': chrome.extension.getURL("rules_modal.html")
}).done(function(data){
  $('body').append(data);
  updateRuleTable();
  $(document).on("click", '#save_rule_modal', function(){
    removeRules(remove_queue, updateRuleTable);
    $('#myModal').modal('hide');
    loaded(); //TODO FIX, Is not working?
  });
  $(document).on("submit", "#add_rule_form", function(event){
    event.preventDefault();
    var new_rule = $(this).serializeArray()
    if(new_rule[0].name == "rule"){
      if(new_rule[0].value == "title_contains"){
        addRule({'title_contains': new_rule[1].value}, updateRuleTable);
      }
    }
  });
});
