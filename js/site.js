/* Set whatsappReady to true and whatsappNumber to the country code plus
   number, digits only, when the line is live. Example: "6591234567". */
var AUREN = (function () {
  var SITE = {
    whatsappReady: false,
    whatsappNumber: "6500000000"
  };

  var REQUIRED = ["vehicle", "service", "passengers", "luggage", "pickup", "datetime"];
  var ORDER = ["vehicle", "service", "passengers", "luggage", "pickup", "dropoff", "datetime", "hours"];

  function validate(values, messages, now) {
    var errors = {};
    REQUIRED.forEach(function (key) {
      if (!values[key] || !String(values[key]).trim()) errors[key] = messages[key];
    });
    if (!errors.datetime && values.datetime) {
      var when = new Date(values.datetime);
      var clock = typeof now === "number" ? now : Date.now();
      if (Number.isNaN(when.getTime()) || when.getTime() < clock - 60000) {
        errors.datetime = messages.past;
      }
    }
    return errors;
  }

  function compose(values, labels, greeting) {
    var lines = [greeting, ""];
    ORDER.forEach(function (key) {
      var value = values[key];
      if (value == null) return;
      value = String(value).trim();
      if (!value) return;
      if (key === "datetime") value = value.replace("T", " ");
      lines.push(labels[key] + ": " + value);
    });
    return lines.join("\n").trim();
  }

  function mount(doc) {
    var form = doc.querySelector("[data-quote-form]");
    if (!form) return;

    var note = form.querySelector("[data-offline-note]");
    if (note && SITE.whatsappReady) note.hidden = true;

    function setSelect(name, value) {
      var select = form.elements[name];
      if (!select || !value) return;
      var matched = false;
      Array.prototype.forEach.call(select.options, function (option) {
        if (option.value === value) matched = true;
      });
      if (!matched) return;
      select.value = value;
      var field = select.closest("[data-field]");
      if (!field) return;
      field.classList.add("is-set");
      doc.defaultView.setTimeout(function () {
        field.classList.remove("is-set");
      }, 1200);
    }

    doc.querySelectorAll("[data-pick-service]").forEach(function (el) {
      el.addEventListener("click", function () {
        setSelect("service", el.getAttribute("data-pick-service"));
      });
    });

    doc.querySelectorAll("[data-pick-vehicle]").forEach(function (el) {
      el.addEventListener("click", function () {
        setSelect("vehicle", el.getAttribute("data-pick-vehicle"));
      });
    });

    var items = doc.querySelectorAll(".faq-item");
    items.forEach(function (item) {
      var button = item.querySelector("button");
      var panel = item.querySelector(".faq-panel");
      if (!button || !panel) return;
      button.addEventListener("click", function () {
        var open = button.getAttribute("aria-expanded") === "true";
        items.forEach(function (other) {
          var otherButton = other.querySelector("button");
          var otherPanel = other.querySelector(".faq-panel");
          if (!otherButton || !otherPanel) return;
          otherButton.setAttribute("aria-expanded", "false");
          otherPanel.hidden = true;
        });
        button.setAttribute("aria-expanded", open ? "false" : "true");
        panel.hidden = open;
      });
    });

    function messages() {
      return {
        vehicle: form.getAttribute("data-err-vehicle"),
        service: form.getAttribute("data-err-service"),
        passengers: form.getAttribute("data-err-passengers"),
        luggage: form.getAttribute("data-err-luggage"),
        pickup: form.getAttribute("data-err-pickup"),
        datetime: form.getAttribute("data-err-datetime"),
        past: form.getAttribute("data-err-past")
      };
    }

    function clearErrors() {
      form.querySelectorAll(".field-error").forEach(function (node) {
        node.hidden = true;
        node.textContent = "";
      });
      form.querySelectorAll("[aria-invalid]").forEach(function (node) {
        node.removeAttribute("aria-invalid");
      });
    }

    function raw(name) {
      var el = form.elements[name];
      return el ? String(el.value || "").trim() : "";
    }

    function shown(name) {
      var el = form.elements[name];
      if (!el) return "";
      if (el.tagName === "SELECT") {
        var option = el.options[el.selectedIndex];
        if (!option || !option.value) return "";
        return option.text;
      }
      return String(el.value || "").trim();
    }

    function labelText(name) {
      var el = form.elements[name];
      if (!el || !el.id) return name;
      var label = form.querySelector('label[for="' + el.id + '"]');
      return label ? label.textContent.replace(/\s+/g, " ").trim() : name;
    }

    var status = form.querySelector("[data-status]");
    var draft = form.querySelector("[data-draft]");

    form.addEventListener("input", clearOne);
    form.addEventListener("change", clearOne);

    function clearOne(event) {
      var field = event.target.closest ? event.target.closest("[data-field]") : null;
      if (!field) return;
      var noteNode = field.querySelector(".field-error");
      if (noteNode) {
        noteNode.hidden = true;
        noteNode.textContent = "";
      }
      event.target.removeAttribute("aria-invalid");
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearErrors();
      if (draft) draft.hidden = true;

      var values = {};
      REQUIRED.concat(["dropoff", "hours"]).forEach(function (key) {
        values[key] = raw(key);
      });

      var errors = validate(values, messages());
      var keys = Object.keys(errors);
      if (keys.length) {
        keys.forEach(function (key) {
          var field = form.querySelector('[data-field="' + key + '"]');
          if (!field) return;
          var input = field.querySelector("input, select");
          var noteNode = field.querySelector(".field-error");
          if (noteNode) {
            noteNode.hidden = false;
            noteNode.textContent = errors[key];
            if (input) input.setAttribute("aria-describedby", noteNode.id);
          }
          if (input) input.setAttribute("aria-invalid", "true");
        });
        if (status) {
          status.textContent = form.getAttribute("data-status-invalid");
          status.className = "form-status is-error";
        }
        var first = form.querySelector('[data-field="' + keys[0] + '"] input, [data-field="' + keys[0] + '"] select');
        if (first) first.focus();
        return;
      }

      var display = {};
      var labels = {};
      ORDER.forEach(function (key) {
        display[key] = shown(key);
        labels[key] = labelText(key);
      });

      var message = compose(display, labels, form.getAttribute("data-greeting"));
      if (draft) {
        draft.hidden = false;
        draft.textContent = message;
      }

      if (SITE.whatsappReady && SITE.whatsappNumber) {
        if (status) {
          status.textContent = form.getAttribute("data-status-online");
          status.className = "form-status";
        }
        var href = "https://wa.me/" + SITE.whatsappNumber + "?text=" + encodeURIComponent(message);
        doc.defaultView.open(href, "_blank", "noopener,noreferrer");
        return;
      }

      if (status) {
        status.textContent = form.getAttribute("data-status-offline");
        status.className = "form-status";
      }
    });
  }

  return { validate: validate, compose: compose, mount: mount, site: SITE };
})();

if (typeof module === "object" && module.exports) {
  module.exports = AUREN;
}

if (typeof document !== "undefined") {
  AUREN.mount(document);
}
