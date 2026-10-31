// Kayıtların gönderileceği adres. Boşken form hiçbir şey göndermez ve hata gösterir.
// Gövde JSON olarak gider; seçilecek form servisine göre biçim değişebilir.
const FORM_ENDPOINT = "";

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

function validateSignup(values) {
  const errors = {};
  if (!values.name || values.name.trim() === "") {
    errors.name = "Lütfen adını ve soyadını yaz.";
  }
  if (!EMAIL_PATTERN.test(values.email || "")) {
    errors.email = "Lütfen geçerli bir e-posta adresi yaz.";
  }
  if (!values.profession) {
    errors.profession = "Lütfen mesleğini seç.";
  }
  return errors;
}

async function sendSignup(values, endpoint = FORM_ENDPOINT) {
  if (!endpoint) return { ok: false, reason: "no_endpoint" };
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) return { ok: false, reason: "network" };
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: "network" };
  }
}

function initSignupForm() {
  const form = document.getElementById("signup-form");
  const fields = {
    name: document.getElementById("signup-name"),
    email: document.getElementById("signup-email"),
    profession: document.getElementById("signup-profession"),
  };
  const fieldErrors = {
    name: document.getElementById("signup-name-error"),
    email: document.getElementById("signup-email-error"),
    profession: document.getElementById("signup-profession-error"),
  };
  const formError = document.getElementById("signup-error");
  const submit = document.getElementById("signup-submit");
  const thanks = document.querySelector("#signup-success .card");

  const NO_ENDPOINT_MESSAGE = "Şu an kayıt alamıyoruz, lütfen daha sonra tekrar deneyin.";
  const NETWORK_MESSAGE = "Kaydın gönderilemedi. İnternet bağlantını kontrol edip tekrar dene.";

  function clearErrors() {
    for (const key of Object.keys(fields)) {
      fieldErrors[key].textContent = "";
      fields[key].removeAttribute("aria-invalid");
    }
    formError.hidden = true;
    formError.textContent = "";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors();

    const values = {
      name: fields.name.value.trim(),
      email: fields.email.value.trim(),
      profession: fields.profession.value,
    };
    const errors = validateSignup(values);
    const invalid = Object.keys(fields).filter((key) => errors[key]);
    if (invalid.length > 0) {
      for (const key of invalid) {
        fieldErrors[key].textContent = errors[key];
        fields[key].setAttribute("aria-invalid", "true");
      }
      fields[invalid[0]].focus();
      return;
    }

    submit.disabled = true;
    const result = await sendSignup(values);
    if (result.ok) {
      form.hidden = true;
      thanks.hidden = false;
      return;
    }
    formError.textContent = result.reason === "no_endpoint" ? NO_ENDPOINT_MESSAGE : NETWORK_MESSAGE;
    formError.hidden = false;
    submit.disabled = false;
  });
}

if (typeof document !== "undefined") initSignupForm();
