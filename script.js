var groups_missing = [];
var groups_bad = [];

var missing = [];
var missing_submitted = [];
var bad = [];

function qs(i) { return document.querySelector(i) }
function qsa(i) { return document.querySelectorAll(i) }

chrome.storage.local.get(
    [
        "assignmentExceptions",
        "assignmentNames",
        "groupsMissing",
        "groupsBad",
        "missing",
        "missing_submitted",
        "bad",
        "linksMissing",
        "linksBad"
    ],
    function (data) {
        groups_missing = data.groupsMissing;
        groups_bad = data.groupsBad;

        !data.assignmentExceptions && (chrome.storage.local.set({ assignmentExceptions: [] }));
        !data.assignmentNames && (chrome.storage.local.set({ assignmentNames: [] }));

        !data.missing && (chrome.storage.local.set({ missing: [] }), missing = []);
        !data.missing_submitted && (chrome.storage.local.set({ missing_submitted: [] }), missing_submitted = []);
        !data.bad && (chrome.storage.local.set({ bad: [] }), bad = []);

        // !data.linksMissing && (chrome.storage.local.set({ linksMissing: [] }));
        // !data.linksBad && (chrome.storage.local.set({ linksBad: [] }));

        !data.groupsMissing && (chrome.storage.local.set({ groupsMissing: [] }), groups_missing = []);
        !data.groupsBad && (chrome.storage.local.set({ groupsBad: [] }), groups_bad = []);
    });

function listeners_set() {
    var listeners = {
        "#reset": () => {
            chrome.runtime.sendMessage({ type: "msg", value: "missing" });
            chrome.runtime.sendMessage({ type: "msg", value: "bad" });
        },
        "#missingTabs": () => chrome.runtime.sendMessage({ type: "msg", value: "missingTabs" }),
        "#badTabs": () => chrome.runtime.sendMessage({ type: "msg", value: "badTabs" }),
        "#deleteMissing": () => { delete_groups("missing") },
        "#deleteBad": () => { delete_groups("bad") }
    }

    for (let [k, v] of Object.entries(listeners)) {
        qs(k).addEventListener("click", v);
        qs(k).style.cursor = "pointer";
    }
}

function collapse_listeners(category) {
    var parent_li_missing = Array.from(document.querySelectorAll('#missing-container > ul > li'));
    var parent_li_bad = Array.from(document.querySelectorAll('#bad-container > ul > li'));


    if (category == "missing") {

        for (let i of parent_li_missing) {
            i.style.transform = "translateY(0px)";
            i.open = true;
            i.moved = 0;
        }
        for (let x = 0; x < parent_li_missing.length; x++) {
            parent_li_missing[x].addEventListener('click', e => {
                var ul = e.target.querySelector('ul');
                if (e.target.open == true) {
                    ul.style.opacity = "0";
                    setTimeout(() => {
                        for (let i of parent_li_missing) {

                            if (parent_li_missing.indexOf(i) > parent_li_missing.indexOf(e.target)) {
                                i.moved -= ul.clientHeight;
                                i.style.transform = "translateY(" + i.moved + "px)";
                            }
                        }

                    }, 300);
                    e.target.open = false;
                } else if (e.target.open == false) {
                    for (let i of parent_li_missing) {

                        if (parent_li_missing.indexOf(i) > parent_li_missing.indexOf(e.target)) {
                            i.moved += ul.clientHeight;
                            i.style.transform = "translateY(" + i.moved + "px)";
                        }
                    }
                    setTimeout(() => {
                        ul.style.opacity = "1";

                    }, 300);
                    e.target.open = true;
                }
            })
        }
    } else if (category == "bad") {

        for (let i of parent_li_bad) {
            i.style.transform = "translateY(0px)";
            i.open = true;
            i.moved = 0;
        }
        for (let x = 0; x < parent_li_bad.length; x++) {
            parent_li_bad[x].addEventListener('click', e => {
                var ul = e.target.querySelector('ul');
                if (e.target.open == true) {
                    ul.style.opacity = "0";
                    e.target.querySelectorAll('a').forEach(i => {
                        i.style.setProperty('pointer-events', 'none');
                        i.style.setProperty('user-select', 'none');
                    });


                    setTimeout(() => {
                        for (let i of parent_li_bad) {

                            if (parent_li_bad.indexOf(i) > parent_li_bad.indexOf(e.target)) {
                                i.moved -= ul.clientHeight;
                                i.style.transform = "translateY(" + i.moved + "px)";
                            }
                        }

                    }, 300);
                    e.target.open = false;
                } else if (e.target.open == false) {
                    for (let i of parent_li_bad) {

                        if (parent_li_bad.indexOf(i) > parent_li_bad.indexOf(e.target)) {
                            e.target.className = "";
                            i.moved += ul.clientHeight;
                            i.style.transform = "translateY(" + i.moved + "px)";
                        }
                    }
                    setTimeout(() => {
                        ul.style.opacity = "1";
                        e.target.querySelectorAll('a').forEach(i => {
                            i.style.setProperty('pointer-events', '');
                            i.style.setProperty('user-select', '');
                        });
                    }, 300);
                    e.target.open = true;
                }
            })
        }
    }
}

window.onload = () => {
    listeners_set();

    collapse_listeners("missing");
    collapse_listeners("bad");
};


chrome.runtime.onMessage.addListener(function (data) {
    switch (data.type) {
        case "data": {
            if (data.purpose == "create") {
                createTabGroup(data.value, data.title + " (" + data.category[0].toUpperCase() + ")", undefined, data.category);
            }
        } break;
        case "msg": {
            switch (data.value) {
                case "no-page": {
                    alert("Error: no grades tab open");
                } break;
                case "none-found": {
                    if (data.search == "missing") {
                        missing = [];
                        missing_submitted = [];
                        chrome.storage.local.set({ missing: [], missing_submitted: [] });
                        qs("#missing-container").innerHTML = "<h1>Missing</h1>";
                    }
                    else if (data.search == "bad") {
                        bad = [];
                        chrome.storage.local.set({ bad: [] });
                        qs("#bad-container").innerHTML = "<h1>Bad Grades</h1>";
                    }
                } break;
                default: console.log(data.value); break;
            }
        } break;
        case "alert": {
            alert(data.msg);
        } break;
        case "assignment-table": {
            var table = data.value;
            assignment_table_processing(table, data.id);
        } break;
        case "submitted": {
            var submitted = data.value;
            submitted_table_processing(submitted);
        } break;
    }
})


async function createTabGroup(tabIds, groupTitle, groupColor, category) {

    for (let i of groups_bad) {
        chrome.tabs.query({ groupId: i }, function (tabs) {
            if (!tabs.length) groups_bad.splice(groups_bad.indexOf(i), 1);
        })
    }

    for (let i of groups_missing) {
        chrome.tabs.query({ groupId: i }, function (tabs) {
            if (!tabs.length) groups_missing.splice(groups_missing.indexOf(i), 1);
        })
    }
    chrome.storage.local.set({ groupsMissing: groups_missing });
    chrome.storage.local.set({ groupsBad: groups_bad });




    const groupId = await chrome.tabs.group({ tabIds: tabIds });

    await chrome.tabGroups.update(groupId, {
        collapsed: true,
        title: groupTitle,
        color: groupColor,
    });

    console.log(`Tab group "${groupTitle}" created with ID: ${groupId}`);

    if (category == "missing") {
        groups_missing.push(groupId);
        chrome.storage.local.set({ groupsMissing: groups_missing });
    }
    else if (category == "bad") {
        groups_bad.push(groupId);
        chrome.storage.local.set({ groupsBad: groups_bad });
    }

    /* setTimeout(() => {
        chrome.tabs.query({ title: "Home | Schoology" }, function (tabs) {
            console.log(tabs.length)
            for (let tab of tabs) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        setTimeout(() => window.location.href = window.location.href, 2000);
                    }
                })
            }

        }, 1000);
    }) */

}

// chrome.runtime.sendMessage({ type: "msg", value: "run" });

function delete_groups(type) {

    var groups = type == "missing" ? groups_missing : groups_bad;

    if (!confirm("Are you sure you want to delete all course tab groups?")) return;

    for (let id of groups.reverse()) {
        chrome.tabs.query({ groupId: id }, function (tabs) {
            for (let tab of tabs) {
                try { chrome.tabs.remove(tab.id); } catch (e) { }
            }
        })
    }

    if (type == "missing") {
        groups_missing = [];
        chrome.storage.local.set({ groupsMissing: [] });

    } else if (type == "bad") {
        groups_bad = [];
        chrome.storage.local.set({ groupsBad: [] });
    }

    chrome.runtime.sendMessage({ type: "msg", value: "delete" });
}




// set value to what is stored
chrome.storage.local.get("assignmentExceptions", function (data) {
    if (!Object.keys(data).length) return;
    qs("#assignment-exceptions").textContent = data.assignmentExceptions.join("\n");
});
// set value to what is stored
chrome.storage.local.get("assignmentNames", function (data) {
    if (!Object.keys(data).length) return;
    qs("#assignment-names").textContent = data.assignmentNames.join("\n");
});

chrome.storage.local.get("missing", function (data) {

    if (!Object.keys(data).length) return;

    assignment_table_processing(data.missing, "missing-container", false);
    chrome.storage.local.get('missing_submitted', function (data2) {
        submitted_table_processing(data2.missing_submitted, false);
    });
});

chrome.storage.local.get("bad", function (data) {

    if (!Object.keys(data).length) return;

    assignment_table_processing(data.bad, "bad-container", false);
});

// update what is stored
const updateStorage = e => {
    chrome.storage.local.set({
        assignmentExceptions: qs('#assignment-exceptions').value.split('\n'),
        assignmentNames: qs('#assignment-names').value.split('\n')
    });
}


qsa("textarea").forEach(e => {
    e.addEventListener('keydown', updateStorage);
    e.addEventListener('keyup', updateStorage);
    e.addEventListener('keypress', updateStorage);
});


qs('#assignment-exceptions').addEventListener('contextmenu', (e) => {
    e.preventDefault();
    var s = window.getSelection();
    if (s && s.toString().length == 10 && parseInt(s)) {
        chrome.tabs.create({ url: "https://ocs.schoology.com/assignment/" + s + "/" });
    }
})

function assignment_table_processing(table, id, listener = true) {

    qs("#" + id).innerHTML = qs("#" + id + " div").outerHTML;

    var ul = document.createElement("ul");
    for (let [k, v] of Object.entries(table)) {

        var inner = document.createElement('li');
        inner.id = k.replaceAll(" ", "_");
        inner.textContent = k;

        var open_all_btn = document.createElement('a');
        open_all_btn.className = "open-all-btn";
        open_all_btn.textContent = "Open All";

        inner.appendChild(open_all_btn);
        ul.appendChild(inner);
    }

    ul.querySelectorAll("li").forEach(li => {
        var new_ul = document.createElement('ul');


        table[li.id.replaceAll("_", " ")].forEach(item => {
            var item_li = document.createElement('li');
            var item_a = document.createElement('a');

            item_a.href = item.link;
            item_a.target = '_blank';
            item_a.textContent = item.name;
            item_li.appendChild(item_a);
            new_ul.appendChild(item_li);
        });

        li.appendChild(new_ul);
    });

    qs("#" + id).appendChild(ul);

    if (id == "missing-container") {
        chrome.storage.local.set({ missing: table });
    } else if (id == "bad-container") {
        chrome.storage.local.set({ bad: table });
    }



    if (id == "bad-container") {
        if (listener) {
            /* qs("#reset").addEventListener('click', () => {
                chrome.runtime.sendMessage({ type: "msg", value: "missing" });
                chrome.runtime.sendMessage({ type: "msg", value: "bad" });
            }) */
            qs("#badTabs").addEventListener('click', () => { chrome.runtime.sendMessage({ type: "msg", value: "badTabs" }) })
            collapse_listeners("bad");
        }

        setTimeout(() => {
            for (let i of qsa('#bad-container li')) {
                if (i.id) { // if it has a course id
                    i.open = true;
                    i.style = '';
                    i.moved = 0;
                }
            }
            // setTimeout(() => {
            for (let i of qsa('#bad-container li')) {
                if (i.id) { // if it has a course id
                    // setTimeout(() => {
                    i.click()
                    // }, Array.from(qsa('#bad-container li')).indexOf(i) * 100);
                }
            }
            // }, 2000);
        }, 100);

        for (let i of qsa('#bad-container .open-all-btn')) {
            i.addEventListener('click', e => {
                var c = e.target.parentElement.textContent.split(e.target.textContent)[0].replaceAll("_", " ");
                chrome.runtime.sendMessage({ type: "course-group", value: c, category: "bad" });
            });
            i.style.cursor = "pointer";
        }
    }



}

function submitted_table_processing(submitted, listener = true) {

    if (!submitted.length) {
        for (let i of qsa('#missing-container .open-all-btn')) {

            i.addEventListener('click', e => {
                var c = e.target.parentElement.textContent.split(e.target.textContent)[0].replaceAll("_", " ");
                chrome.runtime.sendMessage({ type: "course-group", value: c, category: "missing" });
            });
            i.style.cursor = "pointer";
        }
        return;
    };

    qs('#missing-container ul').innerHTML += "<li id='submitted'>Submitted<ul></ul></li>";
    for (let i of submitted) {
        // qs('#submitted ul').innerHTML += "<li title='" + i[1] + "'><a target='_blank' href='" + i[0] + "'>" + i[2] + "</a></li>";
        var li = document.createElement('li');
        li.title = i[1];
        var a = document.createElement('a');
        a.target = "_blank";
        a.href = i[0];
        a.textContent = i[2];
        li.appendChild(a);
        qs('#submitted ul').appendChild(li);
    }
    chrome.storage.local.set({ missing_submitted: submitted });

    if (listener) {
        /* qs("#reset").addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: "msg", value: "missing" });
            chrome.runtime.sendMessage({ type: "msg", value: "bad" });
        }) */ // avoid double
        qs("#missingTabs").addEventListener('click', () => { chrome.runtime.sendMessage({ type: "msg", value: "missingTabs" }) })
        collapse_listeners("missing");
    }

    for (let i of qsa('#missing-container .open-all-btn')) {

        i.addEventListener('click', e => {
            var c = e.target.parentElement.textContent.split(e.target.textContent)[0].replaceAll("_", " ");
            chrome.runtime.sendMessage({ type: "course-group", value: c, category: "missing" });
        });
        i.style.cursor = "pointer";
    }
}

chrome.tabGroups.onRemoved.addListener((group) => {
    groups_bad.splice(groups_bad.indexOf(group.id), 1);
    groups_missing.splice(groups_missing.indexOf(group.id), 1);

    chrome.storage.local.set({ groupsMissing: groups_missing });
    chrome.storage.local.set({ groupsBad: groups_bad });
})