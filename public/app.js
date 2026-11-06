const form = document.querySelector("#course-form");

const nameInput = document.querySelector("#course-name");
const creditsInput = document.querySelector("#course-credits");

const courseList = document.querySelector("#course-list");
const emptyMessage = document.querySelector("#empty-message");
const statusBox = document.querySelector("#status");

const addButton = document.querySelector("#add-button");
const refreshButton = document.querySelector("#refresh-button");

let currentCourses = [];

function showStatus(message, type = "") {
  statusBox.textContent = message;
  statusBox.className = `status ${type}`;
}

function renderCourses(courses) {
  currentCourses = courses;
  courseList.replaceChildren();
  emptyMessage.hidden = courses.length > 0;

  for (const course of courses) {
    const row = document.createElement("tr");

    const idCell = document.createElement("td");
    idCell.textContent = course.id;

    const nameCell = document.createElement("td");
    nameCell.textContent = course.name;

    const creditsCell = document.createElement("td");
    creditsCell.textContent = course.credits;

    const actionCell = document.createElement("td");

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "Update";
    editBtn.addEventListener("click", () => enterEditMode(row, course));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "danger-button";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => handleDelete(course));

    actionCell.append(editBtn, deleteBtn);

    row.append(idCell, nameCell, creditsCell, actionCell);
    courseList.appendChild(row);
  }
}

function enterEditMode(row, course) {
  const [, nameCell, creditsCell, actionCell] = row.children;

  const nameField = document.createElement("input");
  nameField.type = "text";
  nameField.maxLength = 150;
  nameField.value = course.name;
  nameField.required = true;

  const creditsField = document.createElement("input");
  creditsField.type = "number";
  creditsField.min = 1;
  creditsField.max = 6;
  creditsField.step = 1;
  creditsField.value = course.credits;
  creditsField.required = true;

  nameCell.replaceChildren(nameField);
  creditsCell.replaceChildren(creditsField);

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.textContent = "Save";
  saveBtn.addEventListener("click", () =>
    saveInline(course.id, nameField, creditsField, saveBtn)
  );

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "secondary-button";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => renderCourses(currentCourses));

  actionCell.replaceChildren(saveBtn, cancelBtn);

  // Enter (ในช่อง input) = บันทึก, Esc = ยกเลิก
  row.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT") saveBtn.click();
    if (e.key === "Escape") cancelBtn.click();
  });

  nameField.focus();
  nameField.select();
}

async function saveInline(id, nameField, creditsField, saveBtn) {
  const name = nameField.value.trim();
  const credits = Number(creditsField.value);

  if (
    name.length === 0 ||
    name.length > 150 ||
    !Number.isInteger(credits) ||
    credits < 1 ||
    credits > 6
  ) {
    showStatus("Please enter valid course data.", "error");
    return;
  }

  saveBtn.disabled = true;
  showStatus("Updating course...", "loading");

  try {
    await updateCourse(id, name, credits);

    const refreshed = await loadCourses();

    if (refreshed) {
      showStatus(`Course ID ${id} updated successfully.`, "success");
    } else {
      showStatus(
        "Course updated, but the list could not be refreshed.",
        "error"
      );
    }
  } catch (error) {
    console.error("UPDATE course failed:", error);
    showStatus(error.message, "error");
    saveBtn.disabled = false;
  }
}

async function loadCourses() {
  refreshButton.disabled = true;
  showStatus("Loading courses...", "loading");

  try {
    const response = await fetch("/api/courses");

    if (!response.ok) {
      throw new Error(
        `Failed to load courses (HTTP ${response.status})`
      );
    }

    const courses = await response.json();

    if (!Array.isArray(courses)) {
      throw new Error("Invalid API response format");
    }

    renderCourses(courses);

    showStatus(
      `Successfully loaded ${courses.length} courses.`,
      "success"
    );
    return true;

  } catch (error) {
    console.error("GET courses failed:", error);
    showStatus(error.message, "error");
    return false;

  } finally {
    refreshButton.disabled = false;
  }
}

async function createCourse(name, credits) {
  const response = await fetch("/api/courses", {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      name: name,
      credits: credits
    })
  });

  if (!response.ok) {
    let message = `HTTP error ${response.status}`;

    try {
      const errorData = await response.json();

      if (typeof errorData.error === "string") {
        message = errorData.error;
      }
    } catch {

    }

    throw new Error(message);
  }
  return response.json();
}

async function deleteCourse(id, name) {
  const response = await fetch(`/api/courses/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    },
    // ส่งชื่อไปให้ backend ตรวจสอบอีกชั้น
    body: JSON.stringify({ name })
  });

  if (!response.ok) {
    let message = `HTTP error ${response.status}`;

    try {
      const errorData = await response.json();

      if (typeof errorData.error === "string") {
        message = errorData.error;
      }
    } catch {
      // response ไม่ใช่ JSON ใช้ข้อความ default
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function updateCourse(id, name, credits) {
  const response = await fetch(`/api/courses/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: name,
      credits: credits
    })
  });

  if (!response.ok) {
    let message = `HTTP error ${response.status}`;

    try {
      const errorData = await response.json();

      if (typeof errorData.error === "string") {
        message = errorData.error;
      }
    } catch {
      // response ไม่ใช่ JSON ใช้ข้อความ default
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const credits = Number(creditsInput.value);

  if (
    name.length === 0 ||
    name.length > 150 ||
    !Number.isInteger(credits) ||
    credits < 1 ||
    credits > 6
  ) {
    showStatus("Please enter valid course data.", "error");
    return;
  }

  addButton.disabled = true;
  showStatus("Creating course...", "loading");

  try {
    const newCourse = await createCourse(name, credits);

    form.reset();

    const refreshed = await loadCourses();

    if (refreshed) {
      showStatus(
        `Course "${newCourse.name}" created successfully.`,
        "success"
      );
    } else {
      showStatus(
        "Course created, but the list could not be refreshed.",
        "error"
      );
    }

  } catch (error) {
    console.error("POST course failed:", error);
    showStatus(error.message, "error");

  } finally {
    addButton.disabled = false;
  }
});

// ลบจากปุ่มในตาราง (ส่งชื่อของแถวนั้นไปให้ backend ตรวจสอบเอง)
async function handleDelete(course) {
  showStatus("Deleting course...", "loading");

  try {
    await deleteCourse(course.id, course.name);

    const refreshed = await loadCourses();

    if (refreshed) {
      showStatus(`Course "${course.name}" deleted successfully.`, "success");
    } else {
      showStatus("Course deleted, but the list could not be refreshed.", "error");
    }
  } catch (error) {
    console.error("DELETE course failed:", error);
    showStatus(error.message, "error");
  }
}

refreshButton.addEventListener("click", loadCourses);

loadCourses();
