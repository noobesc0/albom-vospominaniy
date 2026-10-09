
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
