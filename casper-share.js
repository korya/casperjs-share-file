var casper = require('casper').create(),
    fs = require('fs');

var usage = function(err) {
  if (err) {
    casper.echo('Error: ' + err);
    casper.echo('');
  }
  casper.echo('Usage: casperjs ' + casper.cli.get('casper-path') + ' files');
  casper.exit(err ? 1 : 0);
}

if (casper.cli.args.length === 0) {
  usage();
}

var config = {}; // XXX dummy var

casper.userAgent('Mozilla/5.0 (Windows NT 6.1) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/28.0.1468.0 Safari/537.36');

casper.myCapture = (function (casper) {
  function pad(num, size) {
    var s = "000000000" + num;
    return s.substr(s.length-size);
  }
  var c = {};
  if (!config.captureEnabled) // XXX Always disabled
    return function () {};
  return function (prefix, suffix) {
    var prefix = arguments[0];
    var suffix = arguments[1];
    if (!c[prefix]) { c[prefix] = 0; }
    var filename =  prefix + '-' + pad(c[prefix], 3) +
      (typeof suffix === 'string' && suffix.length > 0 ? '-' + suffix : '') +
      '.png';
    casper.capture(filename);
    c[prefix]++;
  }
})(casper);

casper.setAttr = function (selector, attribute, value) {
  this.evaluate(function (selector, attribute, value) {
    __utils__.findOne(selector).setAttribute(attribute, value);
  }, {
    selector: selector,
    attribute: attribute,
    value: value,
  });
};
casper.getAttr = function (selector, attribute) {
  return this.evaluate(function (selector, attribute) {
    return __utils__.findOne(selector).getAttribute(attribute);
  }, {
    selector: selector,
    attribute: attribute,
  });
};
casper.assertExists = function (selector) {
  if (casper.visible(selector))
    return;

  casper.die('Element "' + selector + '" was not found', 1);
};

var uploadFile = function (filename) {
  var formSel = 'form#form';
  var fileSel = formSel + ' input[type="file"]';
  var termSel = formSel + ' input[type="checkBox"]';
  var sbmtSel = formSel + ' input[type="submit"]';
  var linkSel = 'body table:nth-of-type(2) td a:first-of-type';

  var capName = 'share-' + (function (filename) {
    var parts = filename.split(fs.separator);
    return parts[parts.length - 1];
  })(filename);

//   casper.echo('Uploading: ' + filename, 'INFO');

  casper.myCapture(capName);

  casper.assertExists(formSel);
  casper.assertExists(fileSel);
  casper.assertExists(termSel);
  casper.assertExists(sbmtSel);

  casper.setAttr(fileSel, 'value', filename);
  casper.page.uploadFile(fileSel, filename);
  casper.myCapture(capName);

  casper.click(termSel);
  casper.myCapture(capName);

  casper.click(sbmtSel);
  casper.myCapture(capName);

  casper.waitUntilVisible(linkSel, function () {
    casper.myCapture(capName);
    var link = casper.evaluate(function (selector) {
      return __utils__.findOne(selector).getAttribute('href');
    }, { selector: linkSel});
    casper.echo(filename + ': ' + link);
  }, function () {
    capture('share');
    casper.echo('timeout');
  }, 30 * 1000);
};

casper.start().each(casper.cli.args, function (casper, filename) {
  var url = 'http://upload.ugm.ac.id/';
  casper.thenOpen(url, function () { uploadFile(filename); });
});

casper.run();
