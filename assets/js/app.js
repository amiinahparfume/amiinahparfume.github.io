// Configuration
const SPREADSHEET_ID = '1yBvROvj6LQ_vu1GEJXD3soQDUrm0EQ30om7SJuozeYI';
const SHEET_NAME = 'DataTransaksi'; // Change to your sheet name
const API_URL = 'https://script.google.com/macros/s/AKfycby-HP7UE0RzzCx-A2AkYsASciIEe4RNccyd9ZSFiP1Y79IFSV5zCLdZYUk46SxkZKv1/exec'; // Your Google Apps Script web app URL

// Data from JSON files
let productsData = {
    parfum: [],
    botol: [],
    bonus: [],
    shift: [],
    paymentMethods: [],
    parfumSizes: [],
    parfumRatios: []
};

// Current state
let cart = [];
let selectedSize = null;
let selectedRatio = 'murni';
let selectedPaymentMethod = null;
let selectedShift = null;

// DOM elements
const cartItems = document.getElementById('cartItems');
const totalAmount = document.getElementById('totalAmount');
const printReceiptBtn = document.getElementById('printReceipt');
const clearCartBtn = document.getElementById('clearCart');
const itemCount = document.getElementById('itemCount');
const emptyCart = document.getElementById('emptyCart');
const parfumQuantityInput = document.getElementById('parfumQuantity');
const splitPaymentDetails = document.getElementById('splitPaymentDetails');
const cashAmountInput = document.getElementById('cashAmount');
const remainingAmountInput = document.getElementById('remainingAmount');
const splitTransferCheckbox = document.getElementById('splitTransfer');
const splitQRISCheckbox = document.getElementById('splitQRIS');
const finalPrintBtn = document.getElementById('finalPrintBtn');

// Modals
const parfumModal = new bootstrap.Modal(document.getElementById('parfumModal'));
const botolModal = new bootstrap.Modal(document.getElementById('botolModal'));
const bonusModal = new bootstrap.Modal(document.getElementById('bonusModal'));
const receiptModal = new bootstrap.Modal(document.getElementById('receiptModal'));

// Load all product data
async function loadProductData() {
    try {
        const [
            parfumRes, 
            botolRes, 
            bonusRes, 
            shiftRes, 
            paymentRes,
            sizesRes,
            ratiosRes
        ] = await Promise.all([
            fetch('parfum.json'),
            fetch('botol.json'),
            fetch('bonus.json'),
            fetch('shift.json'),
            fetch('paymentMethods.json'),
            fetch('parfumSizes.json'),
            fetch('parfumRatios.json')
        ]);
        
        productsData.parfum = await parfumRes.json();
        productsData.botol = await botolRes.json();
        productsData.bonus = await bonusRes.json();
        productsData.shift = await shiftRes.json();
        productsData.paymentMethods = await paymentRes.json();
        productsData.parfumSizes = await sizesRes.json();
        productsData.parfumRatios = await ratiosRes.json();
        
        initializeApp();
    } catch (error) {
        console.error('Error loading product data:', error);
        alert('Gagal memuat data produk. Silakan muat ulang halaman.');
    }
}

function initializeApp() {
    populateSelectOptions();
    setupEventListeners();
    updateCart();
}

function populateSelectOptions() {
    // Populate parfum select
    const parfumSelect = document.getElementById('parfumSelect');
    productsData.parfum.forEach(item => {
        const option = document.createElement('option');
        option.value = item.code;
        option.textContent = `${item.name} - Rp${formatNumber(item.price)}/ml`;
        option.dataset.price = item.price;
        parfumSelect.appendChild(option);
    });
    
    // Populate botol select
    const botolSelect = document.getElementById('botolSelect');
    productsData.botol.forEach(item => {
        const option = document.createElement('option');
        option.value = item.code;
        option.textContent = `${item.name} - Rp${formatNumber(item.price)}`;
        option.dataset.price = item.price;
        botolSelect.appendChild(option);
    });
    
    // Populate bonus select
    const bonusSelect = document.getElementById('bonusSelect');
    productsData.bonus.forEach(item => {
        const option = document.createElement('option');
        option.value = item.code;
        option.textContent = item.name;
        option.dataset.price = item.price || 0;
        bonusSelect.appendChild(option);
    });
    
    // Populate size buttons
    const sizeButtonsContainer = document.getElementById('sizeButtonsContainer');
    productsData.parfumSizes.forEach(size => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-outline-primary size-btn';
        button.dataset.size = size.value;
        button.textContent = size.label;
        button.addEventListener('click', function() {
            document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            selectedSize = this.dataset.size;
            
            if (selectedSize === 'manual') {
                parfumQuantityInput.disabled = false;
                parfumQuantityInput.value = '';
                parfumQuantityInput.focus();
            } else {
                parfumQuantityInput.disabled = true;
                calculateParfumQuantity();
            }
        });
        sizeButtonsContainer.appendChild(button);
    });
    
    // Populate ratio buttons
    const ratioButtonsContainer = document.getElementById('ratioButtonsContainer');
    productsData.parfumRatios.forEach(ratio => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-outline-success ratio-btn';
        button.dataset.ratio = ratio.value;
        button.textContent = ratio.label;
        button.addEventListener('click', function() {
            document.querySelectorAll('.ratio-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            selectedRatio = this.dataset.ratio;
            calculateParfumQuantity();
        });
        ratioButtonsContainer.appendChild(button);
    });
    
    // Set default ratio to 'murni'
    document.querySelector('.ratio-btn[data-ratio="murni"]').classList.add('active');
    
    // Populate payment methods
    const paymentMethodsContainer = document.getElementById('paymentMethodsContainer');
    productsData.paymentMethods.forEach(method => {
        const card = document.createElement('div');
        card.className = 'payment-method card border p-2 text-center';
        card.dataset.method = method.value;
        
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body p-1';
        
        const icon = document.createElement('i');
        icon.className = `${method.icon} fa-2x mb-1 text-${method.color}`;
        
        const name = document.createElement('p');
        name.className = 'mb-0 small';
        name.textContent = method.label;
        
        cardBody.appendChild(icon);
        cardBody.appendChild(name);
        card.appendChild(cardBody);
        paymentMethodsContainer.appendChild(card);
        
        card.addEventListener('click', function() {
            document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
            this.classList.add('active');
            selectedPaymentMethod = this.dataset.method;
            
            if (selectedPaymentMethod === 'split') {
                splitPaymentDetails.style.display = 'block';
                updateRemainingAmount();
            } else {
                splitPaymentDetails.style.display = 'none';
            }
        });
    });
    
    // Populate shift operators
    const shiftContainer = document.getElementById('shiftContainer');
    productsData.shift.forEach(operator => {
        const card = document.createElement('div');
        card.className = 'shift-operator card border p-2 text-center';
        card.dataset.operator = operator.name;
        
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body p-1';
        
        const icon = document.createElement('i');
        icon.className = 'fas fa-user fa-2x mb-1 text-primary';
        
        const name = document.createElement('p');
        name.className = 'mb-0 small';
        name.textContent = operator.name;
        
        cardBody.appendChild(icon);
        cardBody.appendChild(name);
        card.appendChild(cardBody);
        shiftContainer.appendChild(card);
        
        card.addEventListener('click', function() {
            document.querySelectorAll('.shift-operator').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            selectedShift = this.dataset.operator;
        });
    });
}

function setupEventListeners() {
    // Category cards
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            
            switch(category) {
                case 'parfum':
                    resetParfumForm();
                    parfumModal.show();
                    break;
                case 'botol':
                    resetBotolForm();
                    botolModal.show();
                    break;
                case 'bonus':
                    resetBonusForm();
                    bonusModal.show();
                    break;
            }
        });
    });
    
    // Form submissions
    document.getElementById('parfumForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const quantityInput = document.getElementById('parfumQuantity');
        const quantity = parseInt(quantityInput.value);
        
        if (!selectedSize) {
            alert('Pilih ukuran terlebih dahulu');
            return;
        }
        
        if (isNaN(quantity) || quantity < 1) {
            alert('Masukkan jumlah parfum yang valid (minimal 1)');
            quantityInput.focus();
            return;
        }
        
        addToCart('parfum', 'parfumSelect', 'parfumQuantity');
        resetParfumForm();
        parfumModal.hide();
    });
    
    document.getElementById('botolForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const quantity = parseInt(document.getElementById('botolQuantity').value);
        if (quantity < 1) {
            alert('Jumlah botol tidak boleh 0');
            return;
        }
        addToCart('botol', 'botolSelect', 'botolQuantity');
        resetBotolForm();
        botolModal.hide();
    });
    
    document.getElementById('bonusForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const quantity = parseInt(document.getElementById('bonusQuantity').value);
        if (quantity < 1) {
            alert('Jumlah bonus tidak boleh 0');
            return;
        }
        addToCart('bonus', 'bonusSelect', 'bonusQuantity');
        resetBonusForm();
        bonusModal.hide();
    });
    
    // Clear cart
    clearCartBtn.addEventListener('click', clearCart);
    
    // Print receipt
    printReceiptBtn.addEventListener('click', prepareReceipt);
    
    // Final print button in receipt modal
    finalPrintBtn.addEventListener('click', function() {
        window.print();
        sendDataToGoogleSheet();
    });
    
    // Cash amount input for split payment
    cashAmountInput.addEventListener('input', updateRemainingAmount);
}

function calculateParfumQuantity() {
    if (!selectedSize || selectedSize === 'manual') return;
    
    const size = parseInt(selectedSize);
    let quantity;
    
    switch(selectedRatio) {
        case '1:1':
            quantity = Math.ceil(size * 0.5); // 1:1 = 1/2
            break;
        case '2:1':
            quantity = Math.ceil(size * (2/3)); // 2:1 = 2/3
            break;
        case '3:1':
            quantity = Math.ceil(size * (3/4)); // 3:1 = 3/4
            break;
        case 'murni':
            quantity = size; // Murni = 1/1
            break;
        default:
            quantity = size;
    }
    
    parfumQuantityInput.value = quantity;
}

function updateRemainingAmount() {
    if (selectedPaymentMethod !== 'split') return;
    
    const total = getCartTotal();
    const cashAmount = parseFloat(cashAmountInput.value) || 0;
    const remaining = total - cashAmount;
    
    remainingAmountInput.value = remaining > 0 ? remaining : 0;
}

function getCartTotal() {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
}

function resetParfumForm() {
    document.getElementById('parfumSelect').selectedIndex = 0;
    document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.ratio-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.ratio-btn[data-ratio="murni"]').classList.add('active');
    parfumQuantityInput.value = '';
    parfumQuantityInput.disabled = true;
    selectedSize = null;
    selectedRatio = 'murni';
}

function resetBotolForm() {
    document.getElementById('botolSelect').selectedIndex = 0;
    document.getElementById('botolQuantity').value = 1;
}

function resetBonusForm() {
    document.getElementById('bonusSelect').selectedIndex = 0;
    document.getElementById('bonusQuantity').value = 1;
}

function addToCart(category, selectId, quantityId) {
    const selectElement = document.getElementById(selectId);
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const quantity = parseInt(document.getElementById(quantityId).value);
    
    const productData = productsData[category].find(item => item.code === selectedOption.value);
    
    if (!productData) {
        alert('Produk tidak ditemukan');
        return;
    }
    
    const item = {
        category: category,
        code: selectedOption.value,
        name: productData.name,
        price: productData.price || 0,
        quantity: quantity,
        subtotal: (productData.price || 0) * quantity,
        size: category === 'parfum' ? selectedSize : null,
        ratio: category === 'parfum' ? selectedRatio : null
    };
    
    cart.push(item);
    updateCart();
}

function updateCart() {
    cartItems.innerHTML = '';
    
    if (cart.length === 0) {
        emptyCart.style.display = '';
        printReceiptBtn.disabled = true;
        itemCount.textContent = '0 item';
        totalAmount.textContent = 'Rp0';
        return;
    }
    
    emptyCart.style.display = 'none';
    
    let total = 0;
    let itemCountValue = 0;
    
    cart.forEach((item, index) => {
        total += item.subtotal;
        
        if (item.category === 'parfum') {
            itemCountValue += 1;
        } else {
            itemCountValue += item.quantity;
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <span class="badge ${getCategoryBadgeClass(item.category)}">
                    ${item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                </span>
            </td>
            <td>${item.name} ${item.size ? `(${item.size}ml ${item.ratio})` : ''}</td>
            <td>${item.price > 0 ? 'Rp' + formatNumber(item.price) : 'Gratis'}</td>
            <td>${item.quantity} ${item.category === 'parfum' ? 'ml' : ''}</td>
            <td>${item.price > 0 ? 'Rp' + formatNumber(item.subtotal) : 'Gratis'}</td>
            <td>
                <button class="btn btn-sm btn-outline-danger remove-item" data-index="${index}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        cartItems.appendChild(row);
    });
    
    totalAmount.textContent = 'Rp' + formatNumber(total);
    itemCount.textContent = itemCountValue + (itemCountValue > 1 ? ' items' : ' item');
    printReceiptBtn.disabled = false;
    
    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            cart.splice(index, 1);
            updateCart();
        });
    });
}

function clearCart() {
    if (cart.length === 0) return;
    
    if (confirm('Apakah Anda yakin ingin mengosongkan keranjang belanja?')) {
        cart = [];
        updateCart();
        document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
        selectedPaymentMethod = null;
        splitPaymentDetails.style.display = 'none';
        document.querySelectorAll('.shift-operator').forEach(card => {
            card.classList.remove('active');
        });
        selectedShift = null;
    }
}

function prepareReceipt() {
    if (!selectedPaymentMethod) {
        alert('Pilih metode pembayaran terlebih dahulu');
        return;
    }
    
    if (!selectedShift) {
        alert('Pilih operator shift terlebih dahulu');
        return;
    }
    
    if (selectedPaymentMethod === 'split') {
        const cashAmount = parseFloat(cashAmountInput.value) || 0;
        const remaining = parseFloat(remainingAmountInput.value) || 0;
        const total = getCartTotal();
        
        if (cashAmount <= 0) {
            alert('Masukkan jumlah tunai yang valid untuk pembayaran split');
            cashAmountInput.focus();
            return;
        }
        
        if (!splitTransferCheckbox.checked && !splitQRISCheckbox.checked) {
            alert('Pilih metode pembayaran untuk sisa pembayaran (Transfer atau QRIS)');
            return;
        }
        
        if (Math.abs(cashAmount + remaining - total) > 100) {
            alert('Jumlah tunai dan sisa pembayaran tidak sesuai dengan total');
            return;
        }
    }
    
    generateReceipt();
    receiptModal.show();
}

function generateReceipt() {
    const receiptContent = document.getElementById('receiptContent');
    const total = getCartTotal();
    const now = new Date();
    const transactionId = generateTransactionId();
    
    let paymentInfo = '';
    if (selectedPaymentMethod === 'tunai') {
        paymentInfo = '<p class="mb-1">Metode Pembayaran: Tunai</p>';
    } else if (selectedPaymentMethod === 'transfer') {
        paymentInfo = '<p class="mb-1">Metode Pembayaran: Transfer Bank</p>';
    } else if (selectedPaymentMethod === 'qris') {
        paymentInfo = '<p class="mb-1">Metode Pembayaran: QRIS</p>';
    } else if (selectedPaymentMethod === 'split') {
        const cashAmount = parseFloat(cashAmountInput.value) || 0;
        const remaining = parseFloat(remainingAmountInput.value) || 0;
        
        let splitMethods = [];
        if (splitTransferCheckbox.checked) splitMethods.push('Transfer');
        if (splitQRISCheckbox.checked) splitMethods.push('QRIS');
        
        paymentInfo = `
            <p class="mb-1">Metode Pembayaran: Split Payment</p>
            <p class="mb-1">- Tunai: Rp${formatNumber(cashAmount)}</p>
            <p class="mb-1">- ${splitMethods.join('/')}: Rp${formatNumber(remaining)}</p>
        `;
    }
    
    let receiptHTML = `
        <div class="text-center mb-3">
            <h4 class="fw-bold">Parfum Sarjana</h4>
            <p class="mb-1">Jl. Gatak 1, Gatak, Pabelan, Kartasura, Sukoharjo, Jawa Tengah 57169</p>
            <p>0895-6013-80300</p>
            <hr>
            <p class="mb-1">${formatDate(now)}</p>
            <p>No. Transaksi: ${transactionId}</p>
            <hr>
        </div>
        <table class="table table-sm table-borderless">
            <thead>
                <tr>
                    <th>Item</th>
                    <th class="text-end">Qty</th>
                    <th class="text-end">Subtotal</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Group items by category
    const categories = {};
    cart.forEach(item => {
        if (!categories[item.category]) {
            categories[item.category] = [];
        }
        categories[item.category].push(item);
    });
    
    // Add items to receipt by category
    for (const category in categories) {
        receiptHTML += `
            <tr>
                <td colspan="3" class="fw-bold pt-3">
                    ${category.charAt(0).toUpperCase() + category.slice(1)}
                </td>
            </tr>
        `;
                
        categories[category].forEach(item => {
            receiptHTML += `
                <tr>
                    <td>${item.name} ${item.size ? `(${item.size}ml ${item.ratio})` : ''}</td>
                    <td class="text-end">${item.quantity} ${category === 'parfum' ? 'ml' : ''}</td>
                    <td class="text-end">${item.price > 0 ? 'Rp' + formatNumber(item.subtotal) : 'Gratis'}</td>
                </tr>
            `;
        });
    }
    
    receiptHTML += `
            </tbody>
            <tfoot>
                <tr>
                    <th colspan="2" class="text-end pt-3">Total</th>
                    <th class="text-end pt-3">Rp${formatNumber(total)}</th>
                </tr>
            </tfoot>
        </table>
        <hr>
        <div class="mb-3">
            ${paymentInfo}
            <p class="mb-1">Shift Operator: ${selectedShift}</p>
        </div>
        <div class="text-center mt-3">
            <p class="mb-1">Terima kasih atas kunjungan Anda</p>
            <p class="small text-muted">Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan</p>
        </div>
    `;
    
    receiptContent.innerHTML = receiptHTML;
}

async function sendDataToGoogleSheet() {
    if (!API_URL) {
        console.log('No API URL configured for Google Sheets');
        return;
    }

    const now = new Date();
    const transactionId = generateTransactionId();
    const total = getCartTotal();
    
    // Prepare data for Google Sheets
    const sheetData = {
        date: formatDate(now, 'sheet'),
        transactionId: transactionId,
        total: total,
        paymentMethod: selectedPaymentMethod,
        shift: selectedShift,
        items: []
    };
    
    // Group items by category
    const categories = {};
    cart.forEach(item => {
        if (!categories[item.category]) {
            categories[item.category] = [];
        }
        categories[item.category].push(item);
    });
    
    // Format items for the sheet
    for (const category in categories) {
        categories[category].forEach(item => {
            sheetData.items.push({
                category: category,
                name: item.name,
                size: item.size || '',
                ratio: item.ratio || '',
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal
            });
        });
    }
    
    // Add split payment details if applicable
    if (selectedPaymentMethod === 'split') {
        sheetData.cashAmount = parseFloat(cashAmountInput.value) || 0;
        sheetData.remainingAmount = parseFloat(remainingAmountInput.value) || 0;
        sheetData.splitMethods = [];
        if (splitTransferCheckbox.checked) sheetData.splitMethods.push('transfer');
        if (splitQRISCheckbox.checked) sheetData.splitMethods.push('qris');
    }
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(sheetData)
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const result = await response.json();
        console.log('Data sent to Google Sheets:', result);
    } catch (error) {
        console.error('Error sending data to Google Sheets:', error);
    }
}

// Helper functions
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function getCategoryBadgeClass(category) {
    switch(category) {
        case 'parfum': return 'bg-primary';
        case 'botol': return 'bg-success';
        case 'bonus': return 'bg-warning text-dark';
        default: return 'bg-secondary';
    }
}

function generateTransactionId() {
    const now = new Date();
    return `TRX-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function formatDate(date, format = 'display') {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    if (format === 'sheet') {
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } else {
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', function() {
    loadProductData();
});