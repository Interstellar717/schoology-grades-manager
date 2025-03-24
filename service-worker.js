var links_missing = [];
var links_bad = [];
var courses_missing = [];
var courses_bad = [];
var names_missing = [];
var names_bad = [];
var submitted = [];
var ids_missing = [];
var ids_bad = [];
var id_to_course = {};
var course_table_missing = {}; // two tables needed because it is a separate function
var course_table_bad = {};
var assignment_table_missing = {};
var assignment_table_bad = {};

chrome.storage.local.set({ missing: [] });
chrome.storage.local.set({ missing_submitted: [] });
chrome.storage.local.set({ bad: [] });

function reset() {
    links_missing = [];
    links_bad = [];
    courses_missing = [];
    courses_bad = [];
    names_missing = [];
    names_bad = [];
    submitted = [];
    ids_missing = [];
    ids_bad = [];
    id_to_course = {};
    course_table_missing = {}; // two tables needed because it is a separate function
    course_table_bad = {};
    assignment_table_missing = {};
    assignment_table_bad = {};

    chrome.storage.local.set({ missing: [] });
    chrome.storage.local.set({ missing_submitted: [] });
    chrome.storage.local.set({ bad: [] });
}

var mps = {
    1: "1083144",
    2: "1083145",
    3: "1083146",
    4: "1083147"
}

const mp = 3;

chrome.runtime.onMessage.addListener(function (data) {
    switch (data.type) {
        case "msg": {
            switch (data.value) {
                case "missing": {
                    reset();
                    missingGrades();
                } break;

                case "bad": {
                    reset();
                    badGrades();
                } break;

                case "missingTabs": {
                    missingTabs();
                } break;

                case "badTabs": {
                    badTabs();
                } break;

                case "delete": {
                    ids_missing = [];
                    ids_bad = [];
                    id_to_course = {};
                } break;

                default: console.log(data.value); break;
            }
        } break;

        case "link-data-missing": {

            links_missing = data.value;
            courses_missing = data.courses;
            names_missing = data.names;
            submitted = data.submitted || submitted;
        } break;

        case "link-data-bad": {

            links_bad = data.value;
            courses_bad = data.courses;
            names_bad = data.names;
        } break;

        case "course-group": {

            var c = data.value;
            var course_links = [];
            var course_group_ids = [];

            if (data.category == "missing") {
                for (let i in courses_missing) {
                    if (courses_missing[i] == c) {
                        course_links.push(links_missing[i]);
                    }
                }
            } else if (data.category == "bad") {
                for (let i in courses_bad) {
                    if (courses_bad[i] == c) {
                        course_links.push(links_bad[i]);
                    }
                }
            } else console.log('error: data.category == ' + data.category);

            for (let u of course_links) {
                chrome.tabs.create({ url: u }, function (tab) {
                    course_group_ids.push(tab.id);

                    if (course_links.length == course_group_ids.length) {
                        chrome.runtime.sendMessage({ type: "data", purpose: "create", value: course_group_ids, title: c, category: data.category });
                    }
                })
            }
        } break;

    }
})

function missingGrades() {
    chrome.tabs.query({ url: "https://*.schoology.com/grades/grades" }, function (tabs) {

        var tab = tabs[0];

        if (!tab) {
            return function () {
                chrome.tabs.query({ active: true }, (ts) => {

                    // not chrome extension page
                    if (ts[0].url.split("chrome-extension://").length == 1) {
                        chrome.scripting.executeScript({
                            target: { tabId: ts[0].id },
                            func: () => alert("Error: no grades tab open")
                        });
                    } else {
                        chrome.runtime.sendMessage({ type: "msg", value: "no-page" })
                    }


                })
            }();
        } else {
            console.log("missingGrades() going fine");
        }


        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (mps, mp) => {
                chrome.storage.local.get("assignmentExceptions", function (data) {
                    var links_missing = [];
                    var courses_missing = [];
                    var names_missing = [];
                    var submitted = [];
                    var in_mp;

                    var no_grade = document.querySelectorAll('.no-grade');

                    for (let i = 0; i < no_grade.length; i++) {
                        var link, course, name, submission;

                        link = no_grade[i].parentElement.parentElement.parentElement.querySelector('.title a')?.href
                            || no_grade[i].parentElement.parentElement.parentElement.querySelector('.title a')?.href;
                        course = no_grade[i].parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.querySelector('.gradebook-course-title a')?.textContent?.split('Course')[0]
                            || no_grade[i].parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.querySelector('div').textContent.split('Course')[0];


                        name = no_grade[i].parentElement.parentElement.parentElement.querySelector(".title")?.textContent?.split("assignment")[0]?.split("assessment")[0]?.split("external-tool-link")[0];


                        // add detect submitted feature
                        submission = no_grade[i].parentElement.parentElement.querySelector('.grade-wrapper')?.textContent == "This student has made a submission that has not been graded.";
                        !submission && (submission = no_grade[i].parentElement.querySelector('.grade-wrapper')?.textContent == "This student has made a submission that has not been graded.");

                        course = course.split(':')[0].replaceAll('Advanced ', '').replaceAll('AP ', '').replaceAll('Honors ', '');

                        // if an assignment is not graded, it is something to check up on no matter the MP
                        // in_mp = no_grade[i].parentElement.parentElement.parentElement.getAttribute('data-parent-id')?.split(mps[mp])?.length > 1;
                        // !in_mp && (in_mp = no_grade[i].parentElement.parentElement.parentElement.parentElement.getAttribute('data-parent-id')?.split(mps[mp])?.length > 1);
                        in_mp = true;


                        var blacklisted = false;
                        for (let j of data.assignmentExceptions) {
                            j && link?.includes(j) && (blacklisted = true);
                        }


                        if (
                            link &&
                            [
                                // "English 10",
                                "HS Technology Student Association 24-25"
                            ].includes(course) == false &&
                            !names_missing.includes(name) &&
                            !blacklisted &&
                            in_mp
                        ) {
                            if (!submission) {
                                links_missing.push(link);
                                courses_missing.push(course);
                                names_missing.push(name);
                            } else {
                                submitted.push([link, course, name]);
                                // console.log(submitted);
                            }
                        }

                        console.log();
                        if (i + 1 == no_grade.length) { //detect end of loop while still waiting for storage
                            chrome.runtime.sendMessage({ type: "link-data-missing", value: links_missing, courses: courses_missing, names: names_missing, submitted });
                        }

                    }
                })


            },
            args: [mps, mp]
        });

        var check_for_data = setInterval(() => {
            if (links_missing) {
                clearInterval(check_for_data);

                for (let i in courses_missing) assignment_table_missing[courses_missing[i]] = [];
                for (let i in courses_missing) assignment_table_missing[courses_missing[i]].push({
                    name: names_missing[i],
                    link: links_missing[i]
                });
                chrome.runtime.sendMessage({ type: "assignment-table", value: assignment_table_missing, id: "missing-container" });

                chrome.runtime.sendMessage({ type: "submitted", value: submitted });

            }
        }, 100)


    })
}

function badGrades() {

    chrome.tabs.query({ url: "https://ocs.schoology.com/grades/grades" }, function (tabs) {

        var tab = tabs[0];

        if (!tab) {
            return function () {
                chrome.tabs.query({ active: true }, (ts) => {

                    // not chrome extension page
                    if (ts[0].url.split("chrome-extension://").length == 1) {
                        chrome.scripting.executeScript({
                            target: { tabId: ts[0].id },
                            func: () => alert("Error: no grades tab open")
                        });
                    } else {
                        chrome.runtime.sendMessage({ type: "msg", value: "no-page", search: "bad" })
                    }


                })
            }();
        } else {
            console.log("badGrades() going fine");
        }


        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (mps, mp) => {
                chrome.storage.local.get("assignmentExceptions", function (data) {
                    var links_bad = [];
                    var courses_bad = [];
                    var names_bad = [];

                    let grade = document.querySelectorAll('.report-row.item-row .awarded-grade');
                    // let total = document.querySelectorAll('.max-grade');

                    for (let i = 0; i < grade.length; i++) {
                        var link, course, name, in_mp;

                        let g = grade[i];
                        let t = g.parentElement.querySelector(".max-grade");

                        link = g.parentElement.parentElement.parentElement.querySelector('.title a')?.href;
                        course = g.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.querySelector('.gradebook-course-title a')?.textContent?.split('Course')[0];
                        course = course.split(':')[0].replaceAll('Advanced ', '').replaceAll('AP ', '').replaceAll('Honors ', '');;
                        name = g.parentElement.parentElement.parentElement.querySelector(".title")?.textContent
                            || g.parentElement.parentElement.parentElement.parentElement.querySelector(".title")?.textContent;
                        name = name.split('assignment')[0].split('assessment')[0]?.split('external-tool-link')[0];

                        in_mp = g.parentElement.parentElement.parentElement.getAttribute('data-parent-id').split(mps[mp]).length > 1;




                        var blacklisted = false;
                        for (let j of data.assignmentExceptions) {
                            j && link.includes(j) && (blacklisted = true);
                        }

                        if (
                            link &&
                            g.textContent / t.textContent.split(" / ")[1] < .80 &&
                            in_mp &&
                            !blacklisted

                        ) {
                            links_bad.push(link);
                            courses_bad.push(course);
                            names_bad.push(name);
                            // console.log(name + ": " + g.textContent + " / " + t.textContent.split(" / ")[1] + " = " + (g.textContent / t.textContent.split(" / ")[1]), g, t);
                        }

                        if (i + 1 == grade.length) { //detect end of loop while still waiting for storage
                            chrome.runtime.sendMessage({ type: "link-data-bad", value: links_bad, courses: courses_bad, names: names_bad });
                        }


                    }
                });

            },
            args: [mps, mp]
        });
        var count = 0;
        var check_for_data = setInterval(() => {
            count += 100;

            if (links_bad.length || count >= 5000) {
                clearInterval(check_for_data);

                // console.log(links_bad);

                if (links_bad.length == 0) {
                    chrome.runtime.sendMessage({ type: "alert", msg: "None found with search criteria." });
                    chrome.runtime.sendMessage({ type: "msg", value: "none-found", search: "bad" });
                }

                for (let i in courses_bad) assignment_table_bad[courses_bad[i]] = [];
                for (let i in courses_bad) assignment_table_bad[courses_bad[i]].push({
                    name: names_bad[i],
                    link: links_bad[i]
                });
                chrome.runtime.sendMessage({ type: "assignment-table", value: assignment_table_bad, id: "bad-container" });


            }
        }, 100)


    })
}


chrome.action.onClicked.addListener((tab) => {

    chrome.tabs.create({ url: "index.html" }, function (tab) {
        // execute();
    })
});



// fix "Submitted" group
// add setting group ids to storage


function missingTabs() {
    for (let u of links_missing) {
        chrome.tabs.create({ url: u }, function (tab) {
            ids_missing.push(tab.id)
            // check for if done
            if (ids_missing.length == links_missing.length) {

                for (let i in courses_missing) course_table_missing[courses_missing[i]] = [];
                for (let i in courses_missing) course_table_missing[courses_missing[i]].push(ids_missing[i]);


                for (let [k, v] of Object.entries(course_table_missing)) {
                    chrome.runtime.sendMessage({ type: "data", purpose: "create", category: "missing", value: v, title: k });
                }


            }


            setTimeout(() => {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        window.location.href = window.location.href
                    }
                })
            }, 3000);
        });

    }


    var sub_ids = [];

    for (let [link, title] of submitted) {
        chrome.tabs.create({ url: link }, function (tab) {
            sub_ids.push(tab.id);

            if (sub_ids.length == submitted.length) {
                chrome.runtime.sendMessage({ type: "data", purpose: "create", category: "missing", value: sub_ids, title: "Submitted" });
            }


            setTimeout(() => {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        window.location.href = window.location.href
                    }
                })
            }, 3000);
        })
    }
}

function badTabs() {

    for (let u of links_bad) {
        chrome.tabs.create({ url: u }, function (tab) {
            ids_bad.push(tab.id)
            // check for if done
            if (ids_bad.length == links_bad.length) {

                for (let i in courses_bad) course_table_bad[courses_bad[i]] = [];
                for (let i in courses_bad) course_table_bad[courses_bad[i]].push(ids_bad[i]);

                for (let [k, v] of Object.entries(course_table_bad)) {
                    chrome.runtime.sendMessage({ type: "data", purpose: "create", category: "bad", value: v, title: k });
                }
            }


            setTimeout(() => {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        window.location.href = window.location.href
                    }
                })
            }, 3000);
        });

    }
}