
async function loadCloudPhotos() {
  const { data, error } = await supabaseClient
    .from("photos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Ошибка загрузки фотографий:", error);
    return [];
  }

  return (data || []).map((photo) => ({
    id: photo.id,
    title: photo.title || "",
    description: photo.description || "",
    src: photo.image_url || "",
    views: photo.views || 0,
    favorite: Boolean(photo.is_favorite),
    featured: Boolean(photo.is_featured),
    comments: []
  }));
}

async function loadCloudCategories() {
  const { data, error } = await supabaseClient
    .from("categories")
    .select("*")
    .order("name");

  if (error) {
    console.error("Ошибка загрузки категорий:", error);
    return [];
  }

  return (data || []).map((category) => category.name);
}

window.albumCloud = {
  loadPhotos: loadCloudPhotos,
  loadCategories: loadCloudCategories
};

let albumCurrentRole = null;

async function albumRefreshAuth() {
  const authTitle = document.getElementById("authTitle");
  const authMessage = document.getElementById("authMessage");
  const loginForm = document.getElementById("loginForm");
  const loginButton = document.getElementById("loginButton");
  const logoutButton = document.getElementById("logoutButton");
  const editTab = document.querySelector('.menu-tab[data-panel="edit"]');
  const editPanel = document.querySelector('[data-panel-content="edit"]');

  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    authMessage.textContent = "Не удалось проверить вход. Обновите страницу.";
    return;
  }

  const user = data.session?.user;

  albumCurrentRole = null;

  if (user) {
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profileError && profile &&
        ["owner", "editor"].includes(profile.role)) {
      albumCurrentRole = profile.role;
    }
  }

  const canEdit = Boolean(albumCurrentRole);

  if (editTab) editTab.hidden = !canEdit;

  if (editPanel && !canEdit) {
    editPanel.classList.remove("active");
  }

  if (user && canEdit) {
    authTitle.textContent = "Вы вошли в альбом";
    authMessage.textContent =
      albumCurrentRole === "owner"
        ? "Вы вошли как владелец."
        : "Вы вошли как редактор.";
    loginForm.querySelectorAll("label, #loginButton").forEach(el => {
      el.hidden = true;
    });
    logoutButton.hidden = false;
  } else {
    authTitle.textContent = "Вход для редакторов";
    authMessage.textContent = user
      ? "У этого аккаунта нет прав редактирования."
      : "Войдите, чтобы добавлять и редактировать фотографии.";
    loginForm.querySelectorAll("label, #loginButton").forEach(el => {
      el.hidden = false;
    });
    logoutButton.hidden = !user;
  }
}

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const button = document.getElementById("loginButton");
  const message = document.getElementById("authMessage");

  button.disabled = true;
  button.textContent = "Входим…";

  try {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    await albumRefreshAuth();

    if (!albumCurrentRole) {
      message.textContent =
        "Вход выполнен, но профиль не найден или нет прав редактора.";
    } else {
      message.textContent = "Вход выполнен успешно.";
    }
  } catch (error) {
    console.error("Ошибка входа:", error);
    message.textContent =
      "Не удалось войти. Проверьте email, пароль и настройки Supabase.";
  } finally {
    button.disabled = false;
    button.textContent = "Войти";
  }
});

document.getElementById("logoutButton").addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    document.getElementById("authMessage").textContent =
      "Не удалось выйти. Попробуйте ещё раз.";
    return;
  }

  await albumRefreshAuth();
});

albumRefreshAuth();
