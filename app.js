const DEFAULT_API_URL = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:3000/api/productos'
  : 'https://inventario-upb-backend.onrender.com/api/productos';
const apiUrl = () => localStorage.getItem('inventoryApiUrl') || DEFAULT_API_URL;
const state = { products: [], query: '' };

const elements = {
  body: document.querySelector('#productsBody'), empty: document.querySelector('#emptyState'),
  count: document.querySelector('#productCount'), stock: document.querySelector('#stockCount'), value: document.querySelector('#totalValue'),
  label: document.querySelector('#resultsLabel'), search: document.querySelector('#searchInput'), dialog: document.querySelector('#productDialog'),
  form: document.querySelector('#productForm'), formTitle: document.querySelector('#formTitle'), formEyebrow: document.querySelector('#formEyebrow'),
  id: document.querySelector('#productId'), name: document.querySelector('#nameInput'), price: document.querySelector('#priceInput'), stockInput: document.querySelector('#stockInput'),
  formError: document.querySelector('#formError'), save: document.querySelector('#saveButton'), toast: document.querySelector('#toast'),
  settings: document.querySelector('#settingsDialog'), settingsForm: document.querySelector('#settingsForm'), apiInput: document.querySelector('#apiUrlInput'), settingsError: document.querySelector('#settingsError')
};

const money = new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', minimumFractionDigits: 2 });
const date = new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });

async function request(path = '', options = {}) {
  let response;
  const headers = { ...options.headers };
  if (options.body) headers['Content-Type'] = 'application/json';
  try { response = await fetch(`${apiUrl()}${path}`, { ...options, headers }); }
  catch { throw new Error('No se pudo conectar con la API. Verifica que el backend esté iniciado y la URL sea correcta.'); }
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'La operación no se pudo completar.');
  return body;
}

function filteredProducts() {
  const query = state.query.trim().toLocaleLowerCase();
  return query ? state.products.filter(product => product.nombre.toLocaleLowerCase().includes(query)) : state.products;
}

function render() {
  const products = filteredProducts();
  const totalStock = state.products.reduce((sum, product) => sum + Number(product.stock), 0);
  const totalValue = state.products.reduce((sum, product) => sum + Number(product.precio) * Number(product.stock), 0);
  elements.count.textContent = state.products.length;
  elements.stock.textContent = totalStock.toLocaleString('es-BO');
  elements.value.textContent = money.format(totalValue);
  elements.label.textContent = state.query ? `${products.length} resultado${products.length === 1 ? '' : 's'} encontrado${products.length === 1 ? '' : 's'}` : `${state.products.length} producto${state.products.length === 1 ? '' : 's'} en el inventario`;
  elements.body.innerHTML = products.map(product => {
    const stockClass = product.stock === 0 ? 'out' : product.stock < 5 ? 'low' : '';
    return `<tr><td>${escapeHtml(product.nombre)}</td><td class="price">${money.format(product.precio)}</td><td><span class="stock-badge ${stockClass}">${product.stock}</span></td><td class="date">${formatDate(product.createdAt)}</td><td><div class="actions"><button class="action-button" data-edit="${product.id}" aria-label="Editar ${escapeAttribute(product.nombre)}" title="Editar"><svg viewBox="0 0 24 24"><path d="m4 16.5-.8 4.3 4.3-.8L18.7 8.8l-3.5-3.5L4 16.5Z"/><path d="m13.8 6.7 3.5 3.5"/></svg></button><button class="action-button delete" data-delete="${product.id}" aria-label="Eliminar ${escapeAttribute(product.nombre)}" title="Eliminar"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"/></svg></button></div></td></tr>`;
  }).join('');
  elements.empty.hidden = products.length !== 0;
}

function escapeHtml(value) { const node = document.createElement('span'); node.textContent = value; return node.innerHTML; }
function escapeAttribute(value) { return escapeHtml(value).replaceAll('"', '&quot;'); }
function formatDate(value) { if (!value) return '—'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? '—' : date.format(parsed); }
function showToast(message, isError = false) { elements.toast.textContent = message; elements.toast.className = `toast visible${isError ? ' error' : ''}`; clearTimeout(showToast.timer); showToast.timer = setTimeout(() => elements.toast.classList.remove('visible'), 3600); }
function showError(element, message) { element.textContent = message; element.hidden = false; }

async function loadProducts() {
  elements.label.textContent = 'Actualizando inventario…';
  try { state.products = await request(); render(); }
  catch (error) { state.products = []; render(); elements.label.textContent = error.message; showToast(error.message, true); }
}

function openCreateDialog() {
  elements.form.reset(); elements.id.value = ''; elements.formTitle.textContent = 'Agregar producto'; elements.formEyebrow.textContent = 'Nuevo registro';
  elements.save.textContent = 'Guardar producto'; elements.formError.hidden = true; elements.dialog.showModal(); elements.name.focus();
}

function openEditDialog(id) {
  const product = state.products.find(item => item.id === Number(id));
  if (!product) return;
  elements.id.value = product.id; elements.name.value = product.nombre; elements.price.value = product.precio; elements.stockInput.value = product.stock;
  elements.formTitle.textContent = 'Editar producto'; elements.formEyebrow.textContent = `Producto #${product.id}`; elements.save.textContent = 'Guardar cambios'; elements.formError.hidden = true;
  elements.dialog.showModal(); elements.name.focus();
}

async function saveProduct(event) {
  event.preventDefault(); elements.formError.hidden = true;
  const nombre = elements.name.value.trim(); const precio = Number(elements.price.value); const stock = Number(elements.stockInput.value);
  if (!nombre || nombre.length > 100 || !Number.isFinite(precio) || precio < 0 || !Number.isInteger(stock) || stock < 0) { showError(elements.formError, 'Revisa los datos: el nombre es obligatorio, el precio no puede ser negativo y el stock debe ser entero.'); return; }
  const id = elements.id.value; elements.save.disabled = true; elements.save.textContent = 'Guardando…';
  try {
    await request(id ? `/${id}` : '', { method: id ? 'PUT' : 'POST', body: JSON.stringify({ nombre, precio, stock }) });
    elements.dialog.close(); showToast(id ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.'); await loadProducts();
  } catch (error) { showError(elements.formError, error.message); }
  finally { elements.save.disabled = false; elements.save.textContent = id ? 'Guardar cambios' : 'Guardar producto'; }
}

async function deleteProduct(id) {
  const product = state.products.find(item => item.id === Number(id));
  if (!product || !confirm(`¿Eliminar “${product.nombre}”? Esta acción no se puede deshacer.`)) return;
  try { await request(`/${id}`, { method: 'DELETE' }); showToast('Producto eliminado.'); await loadProducts(); }
  catch (error) { showToast(error.message, true); }
}

document.querySelector('#newProductButton').addEventListener('click', openCreateDialog);
document.querySelector('[data-create-product]').addEventListener('click', openCreateDialog);
elements.search.addEventListener('input', event => { state.query = event.target.value; render(); });
elements.body.addEventListener('click', event => { const edit = event.target.closest('[data-edit]'); const remove = event.target.closest('[data-delete]'); if (edit) openEditDialog(edit.dataset.edit); if (remove) deleteProduct(remove.dataset.delete); });
elements.form.addEventListener('submit', saveProduct);
document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => elements.dialog.close()));
document.querySelector('#settingsButton').addEventListener('click', () => { elements.apiInput.value = apiUrl(); elements.settingsError.hidden = true; elements.settings.showModal(); elements.apiInput.focus(); });
document.querySelectorAll('[data-close-settings]').forEach(button => button.addEventListener('click', () => elements.settings.close()));
elements.settingsForm.addEventListener('submit', async event => { event.preventDefault(); const url = elements.apiInput.value.trim().replace(/\/$/, ''); if (!/^https?:\/\/.+\/api\/productos$/i.test(url)) { showError(elements.settingsError, 'Ingresa una URL válida que termine en /api/productos.'); return; } localStorage.setItem('inventoryApiUrl', url); elements.settings.close(); await loadProducts(); });

loadProducts();
