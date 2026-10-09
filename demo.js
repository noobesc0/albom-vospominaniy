const seedPhotos=[
{id:1,title:'Наш вечер',description:'Тёплый вечер, который хочется помнить.',category:'Любимые фото',views:128,favorite:true,featured:true,src:'photo1.svg',comments:[{author:'Аня',text:'Очень любим этот момент ❤️'}]},
{id:2,title:'Путешествие',description:'День, который оказался намного лучше ожиданий.',category:'Путешествия',views:93,favorite:false,featured:true,src:'photo2.svg',comments:[{author:'Макс',text:'Надо обязательно повторить!'}]},
{id:3,title:'Любимый день',description:'Ещё одна маленькая история на память.',category:'Любимые фото',views:176,favorite:true,featured:true,src:'photo3.svg',comments:[]},
{id:4,title:'Тёплые моменты',description:'Простые вещи иногда становятся самыми важными.',category:'Вместе',views:61,favorite:false,featured:false,src:'photo4.svg',comments:[]},
{id:5,title:'Лето вместе',description:'Солнечные дни и хорошее настроение.',category:'Лето',views:204,favorite:true,featured:false,src:'photo5.svg',comments:[]},
{id:6,title:'Наше место',description:'Место, к которому всегда хочется возвращаться.',category:'Любимые места',views:87,favorite:false,featured:false,src:'photo6.svg',comments:[]}
];
const seedCategories=['Любимые фото','Путешествия','Лето','Вместе','Праздники','Любимые места'];
const DB_NAME='albomVospominaniyDB',DB_VERSION=1,STORE='state';
let photos=[],categories=[],activeCategory='Все',selectedPhoto=null,favOffset=0,db=null;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const clone=x=>JSON.parse(JSON.stringify(x));
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function openDB(){return new Promise((resolve,reject)=>{if(!('indexedDB' in window)){resolve(null);return}const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function dbGet(key){return new Promise((resolve,reject)=>{if(!db)return resolve(null);const r=db.transaction(STORE,'readonly').objectStore(STORE).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function dbSet(key,value){return new Promise((resolve,reject)=>{if(!db)return resolve(false);const r=db.transaction(STORE,'readwrite').objectStore(STORE).put(value,key);r.onsuccess=()=>resolve(true);r.onerror=()=>reject(r.error)})}
async function persist(){try{if(db){await dbSet('photos',photos);await dbSet('categories',categories);return true}localStorage.setItem('albumPhotosV6',JSON.stringify(photos));localStorage.setItem('albumCategoriesV6',JSON.stringify(categories));return true}catch(e){return false}}

async function loadState() {
  try {
    db = await openDB();
  } catch (e) {
    db = null;
  }
  try {
    let cloudPhotos = [];
    let cloudCategories = [];

    if (window.albumCloud) {
      [cloudPhotos, cloudCategories] = await Promise.all([
        window.albumCloud.loadPhotos(),
        window.albumCloud.loadCategories()
      ]);
    }
    if (cloudPhotos.length > 0) {
      photos = cloudPhotos;
      categories = cloudCategories.length
        ? cloudCategories
        : clone(seedCategories);
    } else {
      const p = db
        ? await dbGet("photos")
        : JSON.parse(localStorage.getItem("albumPhotosV6") || "null");
      const c = db
        ? await dbGet("categories")
        : JSON.parse(localStorage.getItem("albumCategoriesV6") || "null");
      photos = Array.isArray(p) ? p : clone(seedPhotos);
      categories = Array.isArray(c) ? c : clone(seedCategories);
    }
  } catch (e) {
    console.error("Ошибка загрузки альбома:", e);
    const p = db
      ? await dbGet("photos")
      : JSON.parse(localStorage.getItem("albumPhotosV6") || "null");

    const c = db
      ? await dbGet("categories")
      : JSON.parse(localStorage.getItem("albumCategoriesV6") || "null");
    photos = Array.isArray(p) ? p : clone(seedPhotos);
    categories = Array.isArray(c) ? c : clone(seedCategories);
  }
  photos = photos.map(p => ({
    ...p,
    comments: Array.isArray(p.comments) ? p.comments : [],
    views: Number(p.views) || 0
  }));
  renderAll();
}
function photoSrc(p){return p.src||''}
function sorted(){let arr=[...photos],sort=$('#sortSelect').value;if(sort==='new')arr.sort((a,b)=>b.id-a.id);if(sort==='old')arr.sort((a,b)=>a.id-b.id);if(sort==='views')arr.sort((a,b)=>b.views-a.views);if(activeCategory!=='Все')arr=arr.filter(p=>p.category===activeCategory);return arr}
function renderCategories(){const el=$('#categoryTabs');el.innerHTML=['Все',...categories].map(c=>`<button class="category-tab ${activeCategory===c?'active':''}" data-cat="${escapeHtml(c)}" type="button">${escapeHtml(c)}</button>`).join('');$$('#categoryTabs [data-cat]').forEach(b=>b.onclick=()=>{activeCategory=b.dataset.cat;renderGrid();renderCategories()})}
function renderGrid(){const el=$('#photoGrid');el.innerHTML=sorted().map(p=>`<article class="photo-card" data-id="${p.id}"><div class="photo-image-wrap"><img src="${photoSrc(p)}" alt="${escapeHtml(p.title)}"><button class="photo-fav" type="button">${p.favorite?'♥':'♡'}</button></div><div class="photo-meta"><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.description)}</p><div class="stats"><span>◉ ${p.views} просмотров</span><span>♡ ${p.comments.length} комментариев</span></div></div></article>`).join(''); $$('#photoGrid .photo-card').forEach(card => {   card.onclick = e => {     const id = card.dataset.id;     if (e.target.closest('.photo-fav')) {       toggleFavorite(id);     } else {       openPhoto(id);     }   }; });}
function renderFavorites(){const fav=photos.filter(p=>p.favorite),track=$('#favoriteTrack');track.innerHTML=fav.map(p=>`<article class="favorite-card" data-id="${p.id}"><img src="${photoSrc(p)}" alt="${escapeHtml(p.title)}"><div class="fav-info"><strong>${escapeHtml(p.title)}</strong><small>${p.views} просмотров · ${p.comments.length} комментариев</small></div></article>`).join('')||'<div class="empty-state">Пока нет любимых фотографий.</div>'; $$('#favoriteTrack .favorite-card').forEach(c=>c.onclick=()=>openPhoto(c.dataset.id));updateFavPosition()}
function updateFavPosition(){const track=$('#favoriteTrack'),card=track.querySelector('.favorite-card');if(!card){track.style.transform='none';return}const step=card.offsetWidth+18,visible=Math.max(1,Math.floor(track.parentElement.offsetWidth/step)),max=Math.max(0,photos.filter(p=>p.favorite).length-visible);favOffset=Math.max(0,Math.min(favOffset,max));track.style.transform=`translateX(-${favOffset*step}px)`}
function renderMenuFavorites(){const el=$('#menuFavoriteList'),fav=photos.filter(p=>p.favorite);el.innerHTML=fav.length?fav.map(p=>`<button class="menu-fav-item" data-id="${p.id}" type="button"><img src="${photoSrc(p)}"><span>${escapeHtml(p.title)}</span></button>`).join(''):'<div class="muted">Пока нет любимых фотографий.</div>';$$('#menuFavoriteList [data-id]').forEach(b=>b.onclick=()=>{closeMenu();openPhoto(+b.dataset.id)})}
function populateEdit(){const sel=$('#photoCategory');sel.innerHTML=categories.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');const featuredSel=$('#featuredSelect');if(featuredSel){featuredSel.innerHTML=photos.map(p=>`<option value="${p.id}" ${p.featured?'selected':''}>${escapeHtml(p.title)}</option>`).join('')}const list=$('#adminPhotoList');list.innerHTML=photos.map(p=>`<div class="admin-item"><img src="${photoSrc(p)}"><div class="admin-item-main"><strong>${escapeHtml(p.title)}</strong><small>${escapeHtml(p.category)}</small></div><button type="button" data-feature="${p.id}" title="Сделать любимым моментом">${p.featured?'★':'☆'}</button><button type="button" data-edit="${p.id}">Изменить</button><button type="button" data-delete="${p.id}">Удалить</button></div>`).join('');$$('#adminPhotoList [data-delete]').forEach(b=>b.onclick=async()=>{if(confirm('Удалить фотографию?')){const id=+b.dataset.delete;photos=photos.filter(p=>p.id!==id);if(!photos.some(p=>p.featured)&&photos[0])photos[0].featured=true;await persist();renderAll()}});$$('#adminPhotoList [data-feature]').forEach(b=>b.onclick=async()=>{await setFeatured(+b.dataset.feature)});$$('#adminPhotoList [data-edit]').forEach(b=>b.onclick=async()=>{const p=photos.find(x=>x.id===+b.dataset.edit);if(!p)return;const title=prompt('Название:',p.title);if(title===null)return;const desc=prompt('Описание:',p.description);if(desc===null)return;let cat=prompt('Категория:',p.category);if(cat===null)return;cat=cat.trim()||p.category;p.title=title.trim()||p.title;p.description=desc.trim();p.category=cat;if(!categories.includes(cat))categories.push(cat);await persist();renderAll();setMenuPanel('edit')})}

async function setFeatured(id) {
  const p = photos.find(x => String(x.id) === String(id));
  if (!p) {
    alert('Фотография не найдена.');
    return;
  }

  const { error: resetError } = await supabaseClient
    .from('photos')
    .update({ is_featured: false })
    .neq('id', p.id);

  if (resetError) {
    console.error('Ошибка сброса избранного момента:', resetError);
    alert('Не удалось обновить избранный момент в облаке.');
    return;
  }

  const { data, error } = await supabaseClient
    .from('photos')
    .update({ is_featured: true })
    .eq('id', p.id)
    .select('id');

  if (error || !data || data.length === 0) {
    console.error('Ошибка выбора избранного момента:', error);
    alert('Не удалось сохранить выбранную фотографию в облаке.');
    return;
  }

  photos.forEach(x => {
    x.featured = String(x.id) === String(p.id);
  });

  await persist();
  renderAll();
  setMenuPanel('edit');
}function setMenuPanel(panel){$$('.menu-tab').forEach(b=>b.classList.toggle('active',b.dataset.panel===panel));$$('.menu-panel').forEach(p=>p.classList.toggle('active',p.dataset.panelContent===panel));if(panel==='edit')populateEdit();if(panel==='favorites')renderMenuFavorites()}
function openMenu(panel='album'){const pop=$('#menuPopover');pop.classList.add('open');$('#menuBackdrop').classList.add('open');$('#menuOpen').setAttribute('aria-expanded','true');pop.setAttribute('aria-hidden','false');setMenuPanel(panel)}
function closeMenu(){const pop=$('#menuPopover');pop.classList.remove('open');$('#menuBackdrop').classList.remove('open');$('#menuOpen').setAttribute('aria-expanded','false');pop.setAttribute('aria-hidden','true')}
function setNaturalRatio(url, target){const img=new Image();img.onload=()=>{if(img.naturalWidth&&img.naturalHeight)target.style.aspectRatio=`${img.naturalWidth} / ${img.naturalHeight}`};img.src=url;}
function renderAll(){renderCategories();renderGrid();renderFavorites();renderMenuFavorites();populateEdit();const featured=photos.find(p=>p.featured)||photos[0];if(featured){const src=photoSrc(featured);const heroImg=$('#heroPhotoImage');heroImg.src=src;heroImg.alt=featured.title;heroImg.onload=()=>{setNaturalRatio(src,$('#heroPhoto'));setNaturalRatio(src,$('.hero-card'))};$('#heroTitle').textContent=featured.title;$('#heroPhoto').onclick=()=>openFullscreen(featured.id)}}

async function toggleFavorite(id) {
  const p = photos.find(x => x.id === id);
  if (!p) return;

  const nextFavorite = !p.favorite;

  const { data, error } = await supabaseClient
    .from('photos')
    .update({ is_favorite: nextFavorite })
    .eq('id', id)
    .select('id, is_favorite');

  if (error) {
    console.error('Ошибка сохранения любимого фото:', error);
    alert('Не удалось сохранить отметку в облаке. Подробности есть в консоли.');
    return;
  }

  if (!data || data.length === 0) {
    console.error('Фотография не обновлена в Supabase:', id);
    alert('Облако не подтвердило изменение. Возможно, нужно проверить права доступа.');
    return;
  }

  p.favorite = nextFavorite;
  await persist();
  renderAll();
}
function renderComments(){const list=$('#commentList');list.innerHTML=selectedPhoto.comments.length?selectedPhoto.comments.map(c=>`<div class="comment"><strong>${escapeHtml(c.author)}</strong><p>${escapeHtml(c.text)}</p></div>`).join(''):'<div class="muted">Пока нет комментариев. Будьте первым.</div>'}
async function openPhoto(id){selectedPhoto=photos.find(p=>p.id===id);if(!selectedPhoto)return;selectedPhoto.views++;await persist();$('#modalImage').src=photoSrc(selectedPhoto);$('#modalTitle').textContent=selectedPhoto.title;$('#modalDescription').textContent=selectedPhoto.description;$('#modalCategory').textContent=selectedPhoto.category;$('#modalViews').textContent=`${selectedPhoto.views} просмотров`;$('#modalFavorite').textContent=selectedPhoto.favorite?'♥ Любимое':'♡ Любимое';renderComments();$('#photoModal').classList.remove('hidden');renderGrid();renderFavorites()}
function renderFeaturedPicker(){const el=$('#featuredPickerGrid');if(!el)return;el.innerHTML=photos.map(p=>`<button class="featured-choice ${p.featured?'selected':''}" data-id="${p.id}" type="button"><span class="featured-choice-image"><img src="${photoSrc(p)}" alt="${escapeHtml(p.title)}"></span><span class="featured-choice-copy"><strong>${escapeHtml(p.title)}</strong><small>${escapeHtml(p.category)} · ${p.views} просмотров</small></span><span class="featured-choice-mark">${p.featured?'✓':''}</span></button>`).join('');$$('#featuredPickerGrid [data-id]').forEach(b=>b.onclick=async()=>{const id=+b.dataset.id;await setFeatured(id);closeFeaturedPicker();openFullscreen(id)});}
function openFeaturedPicker(){renderFeaturedPicker();$('#featuredPicker').classList.remove('hidden');}
function closeFeaturedPicker(){$('#featuredPicker').classList.add('hidden');}
function openFullscreen(id){const p=photos.find(x=>x.id===id);if(!p)return;selectedPhoto=p;$('#fullscreenImage').src=photoSrc(p);$('#fullscreenTitle').textContent=p.title;$('#fullscreenStats').textContent=`${p.views} просмотров · ${p.comments.length} комментариев`;$(`#fullscreenFavorite`).textContent=p.favorite?'♥ Любимое':'♡ Любимое';$('#fullscreenModal').classList.remove('hidden')}
function closeFullscreen(){$('#fullscreenModal').classList.add('hidden')}
function closePhotoModal(){$('#photoModal').classList.add('hidden')}
function makePreview(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(new Error('read'));r.onload=()=>{const img=new Image();img.onload=()=>{const max=1800,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.82))};img.onerror=()=>reject(new Error('image'));img.src=r.result};r.readAsDataURL(file)})}

async function addPhoto() {
  const file = $('#photoFile').files[0];

  if (!file) {
    alert('Сначала выберите фотографию.');
    return;
  }

  if (!file.type.startsWith('image/')) {
    alert('Можно добавить только изображение.');
    return;
  }

  if (!window.albumCloud || !window.supabaseClient) {
    alert('Не удалось подключиться к облаку. Обновите страницу.');
    return;
  }

  const btn = $('#savePhoto');
  btn.disabled = true;
  btn.textContent = 'Сохраняем…';

  let uploadedPath = null;
  let insertedPhotoId = null;

  try {
    const { data: authData, error: authError } =
      await supabaseClient.auth.getUser();

    if (authError || !authData.user) {
      throw new Error('Сначала войдите в аккаунт редактора.');
    }

    const { data: profile, error: profileError } =
      await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .maybeSingle();

    if (profileError) throw profileError;

    if (!profile || !['owner', 'editor'].includes(profile.role)) {
      throw new Error('У этого аккаунта нет прав редактирования.');
    }

    const title = $('#photoName').value.trim() || 'Новая фотография';
    const description = $('#photoDesc').value.trim();
    const category = $('#photoCategory').value || categories[0] || 'Без категории';

    const fileExt = (file.name.split('.').pop() || 'jpg')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'jpg';

    const uniquePath =
      `${authData.user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('photos')
      .upload(uniquePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) throw uploadError;
    uploadedPath = uniquePath;

    const { data: publicData } = supabaseClient.storage
      .from('photos')
      .getPublicUrl(uniquePath);

    const imageUrl = publicData.publicUrl;

    const { data: photo, error: insertError } = await supabaseClient
      .from('photos')
      .insert({
        title,
        description,
        image_url: imageUrl,
        storage_path: uniquePath,
        views: 0,
        is_favorite: false,
        is_featured: false
      })
      .select()
      .single();

    if (insertError) throw insertError;
    insertedPhotoId = photo.id;

    const { data: categoryRow, error: categoryError } =
      await supabaseClient
        .from('categories')
        .select('id')
        .eq('name', category)
        .maybeSingle();

    if (categoryError) throw categoryError;

    if (categoryRow) {
      const { error: linkError } = await supabaseClient
        .from('photo_categories')
        .insert({
          photo_id: photo.id,
          category_id: categoryRow.id
        });

      if (linkError) throw linkError;
    }

    const { data: cloudPhotos, error: reloadError } =
      await supabaseClient
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false });

    if (reloadError) throw reloadError;

    photos = (cloudPhotos || []).map(p => ({
      id: p.id,
      title: p.title || '',
      description: p.description || '',
      src: p.image_url || '',
      views: Number(p.views) || 0,
      favorite: Boolean(p.is_favorite),
      featured: Boolean(p.is_featured),
      comments: []
    }));

    $('#photoFile').value = '';
    $('#fileLabel').textContent = 'Нажмите и выберите фото';
    $('#photoName').value = '';
    $('#photoDesc').value = '';

    renderAll();
    setMenuPanel('edit');
    alert('Фотография сохранена в облако!');
  } catch (error) {
    console.error('Ошибка сохранения фотографии:', error);

    if (insertedPhotoId) {
      await supabaseClient.from('photos').delete().eq('id', insertedPhotoId);
    }

    if (uploadedPath) {
      await supabaseClient.storage.from('photos').remove([uploadedPath]);
    }

    alert(
      error.message ||
      'Не удалось сохранить фотографию. Проверьте права Supabase и настройки Storage.'
    );
  } finally {
    btn.disabled = false;
    btn.textContent = '＋ Добавить фото';
  }
}
$('#menuOpen').onclick=()=>openMenu('album');$('#menuClose').onclick=closeMenu;$('#menuBackdrop').onclick=closeMenu;$$('.menu-tab').forEach(b=>b.onclick=()=>setMenuPanel(b.dataset.panel));$('#menuGoAlbum').onclick=()=>{closeMenu();$('#album').scrollIntoView({behavior:'smooth',block:'start'})};$('#menuGoFavorites').onclick=()=>{closeMenu();$('#favorites').scrollIntoView({behavior:'smooth',block:'start'})};

$('#saveFeatured').onclick = async () => {
  const id = $('#featuredSelect').value;
  if (id) await setFeatured(id);
};async function addCategory(){const name=prompt('Название новой категории:');if(!name||!name.trim())return;const clean=name.trim();if(categories.includes(clean)){alert('Такая категория уже существует.');return}categories.push(clean);await persist();activeCategory=clean;renderAll();setMenuPanel('edit')}
$('#addCategoryBtn').onclick=addCategory;$('#catalogAddCategory').onclick=addCategory;$('#sortSelect').onchange=renderGrid;$('#favPrev').onclick=()=>{favOffset--;updateFavPosition()};$('#favNext').onclick=()=>{favOffset++;updateFavPosition()};
$('#modalImage').onclick=()=>selectedPhoto&&openFullscreen(selectedPhoto.id);$('#fullscreenClose').onclick=closeFullscreen;$('#fullscreenEditFeatured').onclick=()=>openFeaturedPicker();$('#pickerClose').onclick=closeFeaturedPicker;$$('[data-picker-close]').forEach(el=>el.onclick=closeFeaturedPicker);$('#fullscreenFavorite').onclick=async()=>{if(selectedPhoto){selectedPhoto.favorite=!selectedPhoto.favorite;await persist();$('#fullscreenFavorite').textContent=selectedPhoto.favorite?'♥ Любимое':'♡ Любимое';renderAll()}};$('#fullscreenComment').onclick=()=>{closeFullscreen();if(selectedPhoto)openPhoto(selectedPhoto.id)};$('#modalFavorite').onclick=async()=>{if(selectedPhoto){selectedPhoto.favorite=!selectedPhoto.favorite;await persist();$('#modalFavorite').textContent=selectedPhoto.favorite?'♥ Любимое':'♡ Любимое';renderAll()}};

$('#commentForm').onsubmit = async e => {
  e.preventDefault();

  if (!selectedPhoto) return;

  const author = $('#commentAuthor').value.trim();
  const text = $('#commentText').value.trim();

  if (!author || !text) return;

  
const { error } = await supabaseClient
  .from('comments')
  .insert({
    photo_id: selectedPhoto.id,
    author_name: author,
    text: text
  });

  if (error) {
    console.error('Ошибка сохранения комментария:', error);
    alert('Не удалось сохранить комментарий в облаке.');
    return;
  }

  selectedPhoto.comments.push({ author, text });

  $('#commentForm').reset();
  renderComments();
  renderGrid();
  renderFavorites();
};$$('[data-close]').forEach(el=>el.onclick=()=>{closePhotoModal();document.body.classList.remove('modal-open')});window.addEventListener('resize',updateFavPosition);
const backToTop=$('#backToTop');
function updateBackToTop(){backToTop.classList.toggle('visible',window.scrollY>420)}
window.addEventListener('scroll',updateBackToTop,{passive:true});
backToTop.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
updateBackToTop();
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();closePhotoModal();closeFullscreen();closeFeaturedPicker()}});document.addEventListener('click',e=>{if($('#menuPopover').classList.contains('open')&&!e.target.closest('#menuPopover')&&!e.target.closest('#menuOpen'))closeMenu()});
loadState();
