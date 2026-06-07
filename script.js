const API_URL = 'https://script.google.com/macros/s/AKfycbwi5uRAIjQ2vjbL7h9_LWAUzArqb4oNDNzHWqfM4dIkINVlY6v1Qv4no9V5ScitexSq/exec';

let globalCatalogue = [];
let currentLenticulaireMode = "achat"; // "achat" ou "location"
let unavailableRentalDates = []; // Liste des dates bloquées renvoyées par le Sheet
let currentDeliveryZone = "reunion"; // "reunion" ou "metropole"
let currentBasePrice = 0;
let currentBaseWeight = 0;
let isCurrentItemAccessory = false;
let isCurrentItemWheelConfigurable = false;
let currentItemStatut = "";
let unavailableTestDates = [];
let currentItemStatut = "";

let cart = [];
let appliedPromo = null;
let discountAmount = 0;

let lastHubSelected = "";

function navigateTo(sectionId) {
    document.getElementById('view-warranty').classList.add('hidden');
    document.getElementById('view-home').classList.remove('hidden');
    
    if(sectionId && sectionId !== 'top') {
        setTimeout(() => {
            const el = document.getElementById(sectionId);
            if(el) {
                const y = el.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({top: y, behavior: 'smooth'});
            }
        }, 50);
    } else {
        window.scrollTo({top: 0, behavior: 'smooth'});
    }
}

function showWarranty() {
    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-warranty').classList.remove('hidden');
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function toggleCart() {
    const panel = document.getElementById('cart-panel');
    const overlay = document.getElementById('cart-overlay');
    
    if (panel.classList.contains('cart-closed')) {
        panel.classList.remove('cart-closed');
        panel.classList.add('cart-open');
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        panel.classList.remove('cart-open');
        panel.classList.add('cart-closed');
        overlay.classList.add('hidden');
        document.body.style.overflow = 'auto';
        
        setTimeout(() => {
            const successView = document.getElementById('checkout-success');
            const contentView = document.getElementById('checkout-content');
            if(successView && contentView) {
                successView.classList.add('hidden');
                successView.classList.remove('flex');
                contentView.classList.remove('hidden');
                contentView.classList.add('flex');
            }
        }, 300);
    }
}

function changeR2View(src) {
    const img = document.getElementById('r2-main-view');
    if(img) {
        img.onerror = null;
        img.src = src;
    }
}

function addToCart() {
    try {
        const titleEl = document.getElementById('modal-title');
        const title = titleEl ? titleEl.textContent : "Produit";
        const titleLC = title.toLowerCase();
        const priceEl = document.getElementById('calc-price');
        let finalPrice = priceEl ? (parseInt(priceEl.textContent) || 0) : 0;
		let finalTitle = title;
        const weightEl = document.getElementById('calc-weight');
        let finalWeight = weightEl ? weightEl.textContent : "--";
        
        if (isCurrentItemAccessory && currentBaseWeight <= 0) {
            finalWeight = "--";
        }
        
        let configText = "";
        const imgEl = document.getElementById('modal-image');
        let imgUrl = imgEl ? imgEl.src : ""; 

		const configSection = document.getElementById('configurator-section');

        if (isCurrentItemWheelConfigurable || (configSection && configSection.style.display !== 'none')) {
            if (isCurrentItemTestProgram) {
                const dateEl = document.getElementById('config-date-test');
                const dateLoc = dateEl && dateEl.value ? getFridayOfWeek(dateEl.value) : "Date non précisée";
                configText = `Week-end du : ${dateLoc} | GHOST 50mm Glossy, Moyeux RT240, Rayons T32`;
                finalPrice = 50;
                finalWeight = 978;
            } else if (titleLC.includes('manivelle')) {
                const modeleEl = document.getElementById('config-modele-manivelle');
                const modele = modeleEl ? modeleEl.options[modeleEl.selectedIndex].text : "";
                const manivelleEl = document.getElementById('config-longueur-manivelle');
                const longueur = manivelleEl ? manivelleEl.value : "";
                const finitionEl = document.getElementById('config-finition-manivelle');
                const finition = finitionEl ? finitionEl.value : "";
                const logoEl = document.getElementById('config-logo-manivelle');
                const logo = logoEl ? logoEl.value : "";
                const plateauxEl = document.getElementById('config-plateaux-manivelle');
                const plateaux = plateauxEl ? plateauxEl.value : "";
                
                let dentureText = "";
                const dentureContainer = document.getElementById('config-denture-container');
                if (dentureContainer && dentureContainer.style.display !== 'none') {
                    const dentureEl = document.getElementById('config-denture-manivelle');
                    if (dentureEl) dentureText = ` | Denture : ${dentureEl.value}`;
                }
                
                configText = `${modele} | Longueur : ${longueur} | Finition : ${finition} | ${logo} | Plateaux : ${plateaux}${dentureText}`;
                
            } else if (isCurrentItemAccessory) {
                const qteEl = document.getElementById('config-quantite');
                const qte = qteEl ? parseInt(qteEl.value) : 1;
                if (titleLC.includes('disque')) {
                    const modeleSelect = document.getElementById('config-galfer-modele');
                    const m = modeleSelect ? modeleSelect.options[modeleSelect.selectedIndex].text.split(' [+')[0] : "";
                    const tailleSelect = document.getElementById('config-galfer-taille');
                    const t = tailleSelect ? tailleSelect.value : "";
                    configText = `Modèle : ${m} | Taille : ${t} | Quantité : ${qte}`;
                } else if (titleLC.includes('pneu') || titleLC.includes('gp5000') || titleLC.includes('tpu') || titleLC.includes('chambre') || titleLC.includes('plaquette')) {
                    const tailleEl = document.getElementById('config-taille-pneu');
                    const taille = tailleEl ? tailleEl.value : "";
                    configText = `Option : ${taille} | Quantité : ${qte}`;
                } else {
                    configText = `Quantité : ${qte}`;
                } 
            } else if (titleLC.includes('bâton') || titleLC.includes('tri-spoke') || titleLC.includes('lenticulaire') || titleLC.includes('disc')) {
            if (currentLenticulaireMode === 'location') {
                const dateEl = document.getElementById('config-date-location');
                const dateLoc = dateEl && dateEl.value ? getFridayOfWeek(dateEl.value) : "Date non précisée";
                const rl = document.getElementById('config-rouelibre-special').value;
                const selectMontage = document.getElementById('config-montage-location');
                const montageText = selectMontage ? selectMontage.value : "Sans Montage";
                const montagePrice = selectMontage && selectMontage.selectedIndex >= 0 ? (parseInt(selectMontage.options[selectMontage.selectedIndex].getAttribute('data-price')) || 0) : 0;

                finalTitle = `${title} (Location Week-end)`;
                configText = `Week-end du : ${dateLoc} | Freins à Disques | Roue libre : ${rl} | Option : ${montageText}`;
                finalPrice = 100 + montagePrice; // Prix de base de 100€ + option de montage
            } else {
                    const freinEl = document.getElementById('config-freinage-special');
                    const rlEl = document.getElementById('config-rouelibre-special');
                    const gammeEl = document.getElementById('config-gamme-special');
                    const ratchetSpecialEl = document.getElementById('config-ratchet-special');
                    const largeurSpecialEl = document.getElementById('config-largeur-special');
                    
                    const frein = freinEl ? freinEl.value : "";
                    const rl = rlEl ? rlEl.value : "";
                    const gamme = gammeEl ? gammeEl.value : "Série STD";
                    
                    let ratchetText = "";
                    if (gamme === 'Série RUXL' && ratchetSpecialEl) {
                        ratchetText = ` | Ratchet : ${ratchetSpecialEl.value}`;
                    }
                    
					let largeurText = "";
	                if ((titleLC.includes('lenticulaire') || titleLC.includes('disc')) && largeurSpecialEl) {
	                    largeurText = ` | Largeur : ${largeurSpecialEl.value}`;
	                }
	                
	                let stickerText = "";
	                const stickerEl = document.getElementById('config-sticker-lenticulaire');
	                if ((titleLC.includes('lenticulaire') || titleLC.includes('disc')) && stickerEl) {
	                    stickerText = ` | Sticker : ${stickerEl.value}`;
	                }
	                
	                if (titleLC.includes('bâton') || titleLC.includes('tri-spoke')) {
	                    configText = `${gamme} | ${frein}`;
	                } else {
	                    configText = `${gamme}${ratchetText}${largeurText}${stickerText} | ${frein} | Roue Libre : ${rl}`;
	                }
                }
			} else {
                const getSelectText = (id) => {
                    const el = document.getElementById(id);
                    if (!el || el.selectedIndex < 0) return "";
                    return el.options[el.selectedIndex].text.split('(')[0].trim();
                };
                
                const moyeu = getSelectText('config-moyeu') || "RT240";
                const janteEl = document.getElementById('config-jante');
                const jante = janteEl ? janteEl.value : "SUXL";
                const rayon = getSelectText('config-rayons') || "T33";
                const ratchet = getSelectText('config-ratchet') || "45T";
                const roulements = getSelectText('config-roulements') || "Acier EZO";
                
                const rouelibreEl = document.getElementById('config-rouelibre');
                const rouelibre = rouelibreEl ? rouelibreEl.value : "Shimano HG";
                
                const finition = getSelectText('config-finition') || "Glossy Black";
                const logos = getSelectText('config-logos') || "Petit logo noir";
                const freinage = getSelectText('config-freinage') || "Disques";
                const disquesVal = document.getElementById('config-disques') ? document.getElementById('config-disques').value : "Aucun";
                const disquesText = disquesVal !== 'Aucun' ? ` | + ${disquesVal}` : "";
                
                const colorEl = document.getElementById('config-couleur-moyeu');
                const couleurMoyeu = (colorEl && colorEl.value) ? " (" + colorEl.value + ")" : "";

                configText = `${moyeu}${couleurMoyeu} | Jantes ${jante} | ${rayon} | Ratchet ${ratchet} | Roulements ${roulements} | ${rouelibre} | ${finition} | Logos : ${logos} | ${freinage}${disquesText}`;
                
                // Ajout des accessoires optionnels (Étapes 10, 11, 12)
                const addAccessoryToConfigText = (selectId) => {
                    const selectEl = document.getElementById(selectId);
                    if (selectEl && selectEl.value !== 'Aucun') {
                        const accPrice = parseInt(selectEl.options[selectEl.selectedIndex].getAttribute('data-price')) || 0;
                        configText += ` | + ${selectEl.value} [+${accPrice}€]`;
                    }
                };
                
                addAccessoryToConfigText('config-pneus');
                addAccessoryToConfigText('config-bidons');
                addAccessoryToConfigText('config-tpu');
				addAccessoryToConfigText('config-plaquettes');
            }
        } else {
            configText = isCurrentItemAccessory ? "Accessoire" : "Modèle Standard";
        }

        const item = {
            id: Date.now(),
            title: finalTitle,
            price: finalPrice,
            weight: finalWeight,
            config: configText,
            image: imgUrl,
            isAccessory: isCurrentItemAccessory
        };

        cart.push(item);
        updateCartUI();
        closeModal();
        toggleCart();
    } catch (e) {
        console.error("Erreur lors de l'ajout au panier:", e);
        alert("Une erreur technique s'est produite lors de l'ajout au panier. L'équipe est informée.");
    }
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
}

function updateCartUI() {
    const container = document.getElementById('cart-items-container');
    const emptyMsg = document.getElementById('empty-cart-msg');
    const badge = document.getElementById('cart-badge');
    
    const subtotalEl = document.getElementById('cart-subtotal');
    const finalTotalEl = document.getElementById('cart-final-total');
    const feesEl = document.getElementById('cart-fees');
    const feeRow = document.getElementById('fee-row');
    
    const checkoutBtn = document.getElementById('checkout-btn');
    const billingContainer = document.getElementById('billing-info-container');
    const paymentMethodContainer = document.getElementById('payment-method-container');
    const errorMsg = document.getElementById('checkout-error');
    
    if (errorMsg) errorMsg.classList.add('hidden');

    const paymentMethodInput = document.querySelector('input[name="payment-method"]:checked');
    const paymentMethod = paymentMethodInput ? paymentMethodInput.value : 'virement';
    
    if (checkoutBtn) {
        if (paymentMethod === 'virement') {
            checkoutBtn.className = "w-full bg-brand-main hover:bg-gray-800 transition-colors text-white font-bold py-4 rounded-xl shadow-md";
            checkoutBtn.innerHTML = 'Valider ma réservation <i class="fa-solid fa-paper-plane ml-2 text-xl"></i>';
        } else if (paymentMethod === 'especes') {
            checkoutBtn.className = "w-full bg-green-600 hover:bg-green-700 transition-colors text-white font-bold py-4 rounded-xl shadow-md";
            checkoutBtn.innerHTML = 'Valider (Paiement en Espèces) <i class="fa-solid fa-hand-holding-dollar ml-2 text-xl"></i>';
        } else if (paymentMethod === 'card1x') {
            checkoutBtn.className = "w-full bg-[#635BFF] hover:bg-[#524be0] transition-colors text-white font-bold py-4 rounded-xl shadow-md";
            checkoutBtn.innerHTML = 'Valider (Paiement Stripe) <i class="fa-solid fa-lock ml-2 text-xl"></i>';
        } else if (paymentMethod === '3x_pei') {
            checkoutBtn.className = "w-full bg-brand-main hover:bg-gray-800 transition-colors text-white font-bold py-4 rounded-xl shadow-md";
            checkoutBtn.innerHTML = 'Valider la réservation en 3X <i class="fa-solid fa-handshake ml-2 text-xl"></i>';
        } else if (paymentMethod === '5050_metropole') {
            checkoutBtn.className = "w-full bg-brand-main hover:bg-gray-800 transition-colors text-white font-bold py-4 rounded-xl shadow-md";
            checkoutBtn.innerHTML = 'Valider mon acompte de 50% <i class="fa-solid fa-percent ml-2 text-xl"></i>';
        }
    }

    if (cart.length > 0) {
        if (badge) {
            badge.textContent = cart.length;
            badge.classList.remove('hidden');
        }
        if (emptyMsg) emptyMsg.style.display = 'none';
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        if (billingContainer) billingContainer.classList.remove('hidden');
        if (paymentMethodContainer) paymentMethodContainer.classList.remove('hidden');
    } else {
        if (badge) badge.classList.add('hidden');
        if (emptyMsg) emptyMsg.style.display = 'block';
        if (checkoutBtn) {
            checkoutBtn.disabled = true;
            checkoutBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        if (billingContainer) billingContainer.classList.add('hidden');
        if (paymentMethodContainer) paymentMethodContainer.classList.add('hidden');
    }

    if (container) {
        Array.from(container.children).forEach(child => {
            if(child.id !== 'empty-cart-msg') child.remove();
        });
    }

    let subtotal = 0;
    discountAmount = 0;
    
    cart.forEach(item => {
        subtotal += item.price;
        
        if (appliedPromo === 'CCPIKARBON') {
            const titleLC = item.title.toLowerCase();
            const isSpecialWheel = titleLC.includes('bâton') || titleLC.includes('tri-spoke') || titleLC.includes('lenticulaire') || titleLC.includes('disc');
            
            if (!item.isAccessory && !isSpecialWheel) {
                discountAmount += 50;
            } else {
                discountAmount += Math.round(item.price * 0.05);
            }
        }
        
        if (container) {
            const div = document.createElement('div');
            div.className = "bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex gap-4 relative group";
            
            let weightDisplay = `<span class="text-xs text-gray-400 font-medium"><i class="fa-solid fa-weight-scale mr-1"></i>${item.weight}g</span>`;
            if (item.weight === "--" || item.weight === "") {
                weightDisplay = ``;
            }

            div.innerHTML = `
                <button onclick="removeFromCart(${item.id})" class="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition shadow hover:bg-red-200"><i class="fa-solid fa-xmark"></i></button>
                <div class="w-16 h-16 bg-gray-50 rounded-lg flex-shrink-0 flex items-center justify-center p-1 border border-gray-100 overflow-hidden">
                    <img src="${item.image}" class="w-full h-full object-contain">
                </div>
                <div class="flex-grow">
                    <h5 class="font-bold text-gray-900 text-sm leading-tight mb-1">${item.title}</h5>
                    <p class="text-[10px] text-gray-500 mb-2 font-medium bg-gray-50 p-1 rounded inline-block">${item.config}</p>
                    <div class="flex justify-between items-center">
                        ${weightDisplay}
                        <span class="font-black text-brand-accent ml-auto">${item.price} €</span>
                    </div>
                </div>
            `;
            container.appendChild(div);
        }
    });

    const promoInputContainer = document.getElementById('promo-input-container');
    const promoActiveContainer = document.getElementById('promo-active-container');
    const originalTotalEl = document.getElementById('cart-original-total');

    if (appliedPromo) {
        if (promoInputContainer) promoInputContainer.classList.add('hidden');
        if (promoActiveContainer) {
            promoActiveContainer.classList.remove('hidden');
            promoActiveContainer.classList.add('flex');
        }
        const activePromoName = document.getElementById('active-promo-name');
        if (activePromoName) activePromoName.textContent = `${appliedPromo} (-${discountAmount}€)`;
        
        if (originalTotalEl) {
            if (discountAmount > 0) {
                originalTotalEl.textContent = `${subtotal} €`;
                originalTotalEl.classList.remove('hidden');
            } else {
                originalTotalEl.classList.add('hidden');
            }
        }
    } else {
        if (promoInputContainer) promoInputContainer.classList.remove('hidden');
        if (promoActiveContainer) {
            promoActiveContainer.classList.add('hidden');
            promoActiveContainer.classList.remove('flex');
        }
        if (originalTotalEl) originalTotalEl.classList.add('hidden');
    }

    let currentSubtotal = subtotal - discountAmount;
    if (subtotalEl) subtotalEl.textContent = currentSubtotal;

    let transactionFees = 0;

    if (currentSubtotal > 0) {
        if (paymentMethod === 'card1x') {
            transactionFees = (currentSubtotal * 0.015) + 0.25;
        }
    }
    
    transactionFees = Math.round(transactionFees * 100) / 100;

    if (feesEl) feesEl.textContent = transactionFees.toFixed(2);
    if (feeRow) {
        if (transactionFees > 0) {
            feeRow.classList.remove('hidden');
            feeRow.classList.add('flex');
        } else {
            feeRow.classList.add('hidden');
            feeRow.classList.remove('flex');
        }
    }

    const finalTotal = currentSubtotal + transactionFees;
    if (finalTotalEl) finalTotalEl.textContent = finalTotal % 1 === 0 ? finalTotal : finalTotal.toFixed(2);
}

function applyPromoCode() {
    const input = document.getElementById('promo-code');
    if(!input) return;
    const code = input.value.trim().toUpperCase();
    if (code === 'CCPIKARBON') {
        appliedPromo = code;
        input.value = '';
        updateCartUI();
    }
}

function removePromoCode() {
    appliedPromo = null;
    discountAmount = 0;
    updateCartUI();
}

function submitOrder() {
    if (cart.length === 0) return;
    
    const nameEl = document.getElementById('client-name');
    const emailEl = document.getElementById('client-email');
    const phoneEl = document.getElementById('client-phone');
    const addressEl = document.getElementById('client-address');
    
    const nomClient = nameEl ? nameEl.value.trim() : "";
    const emailClient = emailEl ? emailEl.value.trim() : "";
    const telClient = phoneEl ? phoneEl.value.trim() : ""; 
    const adresseClient = addressEl ? addressEl.value.trim() : "";
    
    const errorMsg = document.getElementById('checkout-error');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (!nomClient || !emailClient || !telClient || !adresseClient) {
        if (errorMsg) errorMsg.classList.remove('hidden');
        return; 
    } else {
        if (errorMsg) errorMsg.classList.add('hidden');
    }
    
    const originalBtnHtml = checkoutBtn.innerHTML;
    checkoutBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Traitement en cours...';
    checkoutBtn.disabled = true;
    checkoutBtn.classList.add('opacity-75');
    checkoutBtn.classList.remove('hover:bg-gray-800', 'hover:bg-[#524be0]', 'hover:bg-blue-700');
    
    let total = 0;
    let produitsPourFichier = []; 
    let factureNoms = []; 
    let facturePrix = []; 
    
    cart.forEach((item, index) => {
        total += item.price;
        produitsPourFichier.push(`${item.title} (${item.config})`);
        
        factureNoms.push(`• ${item.title}\n  ${item.config}`);
        facturePrix.push(`${item.price} €\n `); 
    });
    
    const currentSubtotal = appliedPromo ? (total - discountAmount) : total;

    const paymentMethodInput = document.querySelector('input[name="payment-method"]:checked');
    const paymentMethodVal = paymentMethodInput ? paymentMethodInput.value : 'virement';
    let transactionFees = 0;
    let paymentMethodName = "Virement";

    if (paymentMethodVal === 'card1x') {
        transactionFees = (currentSubtotal * 0.015) + 0.25;
        paymentMethodName = "Carte Bancaire (1x via Stripe)";
    } else if (paymentMethodVal === 'especes') {
                transactionFees = 0;
                paymentMethodName = "Espèces (À la commande)";
    } else if (paymentMethodVal === '3x_pei') {
        transactionFees = 0;
        paymentMethodName = "Paiement en 3X Karbòn Péi (Sans frais)";
    } else if (paymentMethodVal === '5050_metropole') {
        transactionFees = 0;
        paymentMethodName = "Paiement en 2X Karbòn Péi (Sans frais)";
    }
    
    transactionFees = Math.round(transactionFees * 100) / 100;
    const finalTotal = currentSubtotal + transactionFees;

    if (appliedPromo) {
        factureNoms.push(`\nREMISE (Code : ${appliedPromo})`);
        facturePrix.push(`\n-${discountAmount} €`);
    }

    if (transactionFees > 0) {
        factureNoms.push(`\nFrais de transaction (${paymentMethodName})`);
        facturePrix.push(`\n+${transactionFees.toFixed(2)} €`);
    }

    const orderData = {
        date: new Date().toLocaleString('fr-FR', { timeZone: 'Indian/Reunion' }),
        nom: nomClient,
        email: emailClient, 
        telephone: telClient, 
        adresse: adresseClient,
        produits: produitsPourFichier.join(" + "), 
        factureNoms: factureNoms.join("\n\n"), 
        facturePrix: facturePrix.join("\n\n"), 
        total: finalTotal % 1 === 0 ? finalTotal : finalTotal.toFixed(2),
        promo: appliedPromo || "Aucun",
        statutPaiement: "En attente via " + paymentMethodName,
        statutLivraison: "À traiter"
    };

    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(orderData)
    })
    .then(response => response.text())
    .then(data => {
        const checkoutContent = document.getElementById('checkout-content');
        if (checkoutContent) {
            checkoutContent.classList.add('hidden');
            checkoutContent.classList.remove('flex');
        }
        
        const checkoutSuccess = document.getElementById('checkout-success');
        if (checkoutSuccess) {
            checkoutSuccess.classList.remove('hidden');
            checkoutSuccess.classList.add('flex');
        }
        
        const successPayText = document.getElementById('success-payment-method');
        if (successPayText) {
            if(paymentMethodVal === 'virement') {
                successPayText.textContent = "le RIB pour finaliser la réservation";
            } else if(paymentMethodVal === 'especes') {
                successPayText.textContent = "un message pour se voir afin de procéder au paiement en espèces";
            } else if(paymentMethodVal === 'card1x') {
                successPayText.textContent = "le lien Stripe sécurisé pour le paiement par carte";
            } else if(paymentMethodVal === '3x_pei') {
                successPayText.textContent = "le récapitulatif pour effectuer ton premier versement (50%) et lancer la production à l'usine";
            } else if(paymentMethodVal === '5050_metropole') {
                const acompte = finalTotal / 2;
                successPayText.textContent = "le récapitulatif pour effectuer ton premier versement (50%) et lancer la production à l'usine";
            }
        }

        checkoutBtn.innerHTML = originalBtnHtml;
        checkoutBtn.disabled = false;
        checkoutBtn.classList.remove('opacity-75');
    })
    .catch(error => {
        console.error("Erreur Google :", error);
        checkoutBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation mr-2"></i> Erreur, réessayez';
        checkoutBtn.disabled = false;
        checkoutBtn.classList.remove('opacity-75');
        setTimeout(() => { updateCartUI(); }, 3000);
    });
}

function closeSuccessAndReset() {
    cart = [];
    appliedPromo = null;
    discountAmount = 0;
    const nameEl = document.getElementById('client-name');
    if (nameEl) nameEl.value = '';
    const emailEl = document.getElementById('client-email');
    if (emailEl) emailEl.value = '';
    const phoneEl = document.getElementById('client-phone');
    if (phoneEl) phoneEl.value = '';
    const addressEl = document.getElementById('client-address');
    if (addressEl) addressEl.value = '';
    
    const successEl = document.getElementById('checkout-success');
    if (successEl) {
        successEl.classList.add('hidden');
        successEl.classList.remove('flex');
    }
    const contentEl = document.getElementById('checkout-content');
    if (contentEl) {
        contentEl.classList.remove('hidden');
        contentEl.classList.add('flex');
    }
    
    updateCartUI();
    toggleCart();
}

async function loadCatalogue() {
    try {
        const response = await fetch(API_URL);
        globalCatalogue = await response.json();
        const loader = document.getElementById('loading-message');
        if(loader) loader.style.display = 'none';
        renderGrid('Tout');
    } catch (error) {
        console.error('Erreur:', error);
        const loader = document.getElementById('loading-message');
        if(loader) {
            loader.innerHTML = `
            <div class="bg-red-50 text-red-600 p-4 rounded-lg text-center border border-red-200">
                <i class="fa-solid fa-triangle-exclamation text-2xl mb-2"></i>
                <p class="font-bold">Erreur de connexion au catalogue.</p>
            </div>`;
        }
    }
}

function filterCatalogue(category) {
    const btns = document.querySelectorAll('.filter-btn');
    btns.forEach(btn => {
        if (btn.textContent.includes(category) || (category === 'Tout' && btn.textContent === 'Tout voir')) {
            btn.classList.add('active', 'bg-brand-main', 'text-white');
            btn.classList.remove('bg-white', 'text-gray-700');
        } else {
            btn.classList.remove('active', 'bg-brand-main', 'text-white');
            btn.classList.add('bg-white', 'text-gray-700');
        }
    });
    renderGrid(category);
}

function renderGrid(filterCategory) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = '';
    let count = 0;

    globalCatalogue.forEach((item, index) => {
        if(!item.Nom) return;
        
        const cat = (item.Categorie && item.Categorie.trim() !== "") ? item.Categorie.trim() : "Roues";
        if (filterCategory !== 'Tout' && !cat.toLowerCase().includes(filterCategory.toLowerCase())) return;
        count++;

        const nomLC = item.Nom.toLowerCase();
        const isFixedPriceWheel = nomLC.includes('bâton') || nomLC.includes('tri-spoke') || nomLC.includes('lenticulaire') || nomLC.includes('disc');
        const isAccessory = cat.toLowerCase().includes('accessoire') || cat.toLowerCase().includes('composant');

        let imageUrl = item.Image ? item.Image.split(',')[0].trim() : 'https://images.unsplash.com/photo-1511994298241-608e28f14fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
        let prixAffiche = 'Sur devis';
        if (item.Prix) {
            prixAffiche = (isAccessory || isFixedPriceWheel) ? `${item.Prix} €` : `Dès ${item.Prix} €`;
        }
        
        let statutBadge = '';
        
        if (nomLC.includes('50')) {
            statutBadge += `<span class="absolute top-4 right-4 bg-brand-accent text-brand-main text-xs font-black px-3 py-1 rounded shadow-md z-20 transform rotate-3 border border-yellow-300">⭐ BEST-SELLER</span>`;
        }

        if (item.Statut) {
            const statutLC = item.Statut.toLowerCase();
            if (statutLC.includes('stock')) {
                statutBadge += `<span class="absolute top-4 left-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded shadow-md z-10"><i class="fa-solid fa-check mr-1"></i> En Stock</span>`;
            } else if (statutLC.includes('arrivage')) {
                statutBadge += `<span class="absolute top-4 left-4 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded shadow-md z-10"><i class="fa-solid fa-truck-fast mr-1"></i> Arrivage en cours</span>`;
            } else {
                statutBadge += `<span class="absolute top-4 left-4 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded shadow-md z-10"><i class="fa-solid fa-plane mr-1"></i> ${item.Statut}</span>`;
            }
        }

        let specLigne = '';
        if (isAccessory) {
            const parsedWeight = parseInt(item.Poids) || 0;
            if (parsedWeight > 0) {
                specLigne = `<span class="flex items-center"><i class="fa-solid fa-weight-scale text-brand-accent mr-1.5"></i> ${parsedWeight} g</span>`;
            } else {
                specLigne = ``; 
            }
        } else {
            let weightPrefix = isFixedPriceWheel ? '' : 'Dès ';
            specLigne = `
                <span class="flex items-center"><i class="fa-solid fa-arrows-up-down text-brand-accent mr-1.5"></i> ${item.Hauteur || '-'}</span>
                ${item.Poids ? `<span class="text-gray-300">|</span><span class="flex items-center"><i class="fa-solid fa-weight-scale text-brand-accent mr-1.5"></i> ${weightPrefix}${item.Poids} g</span>` : ''}
            `;
        }

        let labelPrix = (isAccessory || isFixedPriceWheel) ? 'Prix unitaire' : 'Prix (la paire)';

        const cardHtml = `
            <div onclick="openModal(${index})" class="wheel-card bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 flex flex-col relative group cursor-pointer">
                ${statutBadge}
                <div class="overflow-hidden h-64 bg-gray-50 flex items-center justify-center p-4 relative">
                    <img src="${imageUrl}" alt="${item.Nom}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span class="bg-brand-main text-white text-sm font-bold px-5 py-2 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition"><i class="fa-solid fa-eye mr-2"></i>Voir le produit</span>
                    </div>
                </div>
                <div class="p-6 flex flex-col flex-grow text-center">
                    <h4 class="text-xl font-black text-gray-900 mb-2">${item.Nom}</h4>
                    <div class="flex justify-center items-center gap-3 text-sm text-gray-600 mb-4 font-medium">
                        ${specLigne}
                    </div>
                    <div class="mt-auto border-t border-gray-100 pt-4">
                        <span class="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-1">${labelPrix}</span>
                        <span class="text-2xl font-black text-brand-accent">${prixAffiche}</span>
                    </div>
                </div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', cardHtml);
    });
    
    if (count === 0) {
        grid.innerHTML = `<p class="col-span-full text-center text-gray-500 py-10">Aucun produit dans cette catégorie pour le moment.</p>`;
    }
}

function updateHubOptions() {
    const moyeuSelect = document.getElementById('config-moyeu');
    const colorSelect = document.getElementById('config-couleur-moyeu');
    const ratchetSelect = document.getElementById('config-ratchet');
    const roulementsSelect = document.getElementById('config-roulements');
    
    if(!moyeuSelect || !colorSelect || !ratchetSelect || !roulementsSelect) return;

    const currentHub = moyeuSelect.value;
    const isHubChange = (lastHubSelected !== "" && lastHubSelected !== currentHub);
    lastHubSelected = currentHub;

    const currentColor = colorSelect.value;
    const currentRatchet = ratchetSelect.value;
    const currentRoulements = roulementsSelect.value;

    if (currentHub === 'R2') {
        colorSelect.innerHTML = `
            <option value="Noir" data-price="0">Noir (Standard R2)</option>
            <option value="Gris" data-price="50">Gris [+50€]</option>
            <option value="Bleu" data-price="50">Bleu (Anodisé) [+50€]</option>
            <option value="Rose" data-price="50">Rose (Anodisé) [+50€]</option>
            <option value="Vert" data-price="50">Vert (Anodisé) [+50€]</option>
        `;
        ratchetSelect.innerHTML = `
            <option value="45T" data-price="0">45T (Standard R2)</option>
            <option value="72T" data-price="49">72T (Haute réactivité) [+49€]</option>
        `;
        roulementsSelect.innerHTML = `
            <option value="Acier EZO" data-price="0">Acier EZO (Standard R2)</option>
            <option value="Céramique TPI" data-price="79">Céramique TPI (Ultra-fluide) [+79€]</option>
        `;
        
        if (isHubChange) {
            colorSelect.value = 'Noir';
        } else if(Array.from(colorSelect.options).some(opt => opt.value === currentColor)) {
            colorSelect.value = currentColor;
        } else {
            colorSelect.selectedIndex = 0; 
        }

    } else { 
        colorSelect.innerHTML = `
            <option value="Argent" data-price="0">Argent (Standard RT240)</option>
            <option value="Noir" data-price="0">Noir</option>
        `;
        ratchetSelect.innerHTML = `
            <option value="54T" data-price="0">54T (Inclus avec RT240)</option>
        `;
        roulementsSelect.innerHTML = `
            <option value="Céramique SS" data-price="0">Céramique SS (Inclus avec RT240)</option>
        `;
        
        if (isHubChange) {
            colorSelect.value = 'Argent';
        } else if(Array.from(colorSelect.options).some(opt => opt.value === currentColor)) {
            colorSelect.value = currentColor;
        } else {
            colorSelect.selectedIndex = 0; 
        }
    }

    if(Array.from(ratchetSelect.options).some(opt => opt.value === currentRatchet)) {
        ratchetSelect.value = currentRatchet;
    } else {
        ratchetSelect.selectedIndex = 0;
    }
    if(Array.from(roulementsSelect.options).some(opt => opt.value === currentRoulements)) {
        roulementsSelect.value = currentRoulements;
    } else {
        roulementsSelect.selectedIndex = 0;
    }
}

function updateBadgeUI(isOriginalStatus, overrideStatus = null) {
    const badge = document.getElementById('modal-badge');
    if(!badge) return;
    
    let statusToDisplay = "Sur Commande";
    if (overrideStatus && overrideStatus !== "") {
        statusToDisplay = overrideStatus;
    } else if (isOriginalStatus && currentItemStatut !== "") {
        statusToDisplay = currentItemStatut;
    }
    
    const statutLC = statusToDisplay.toLowerCase();
    
    if (statutLC.includes('stock')) {
        badge.className = 'text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide w-max bg-green-100 text-green-700 transition-colors duration-300';
        badge.innerHTML = '<i class="fa-solid fa-check mr-1"></i> En Stock Réunion';
    } else if (statutLC.includes('arrivage')) {
        badge.className = 'text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide w-max bg-blue-100 text-blue-700 transition-colors duration-300';
        badge.innerHTML = '<i class="fa-solid fa-truck-fast mr-1"></i> Arrivage en cours';
    } else if (statutLC.includes('commande')) {
        badge.className = 'text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide w-max bg-orange-100 text-orange-700 transition-colors duration-300';
        badge.innerHTML = `<i class="fa-solid fa-plane mr-1"></i> Sur Commande`;
    } else {
        badge.className = 'text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide w-max bg-orange-100 text-orange-700 transition-colors duration-300';
        badge.innerHTML = `<i class="fa-solid fa-plane mr-1"></i> ${statusToDisplay}`;
    }
}

function openModal(index) {
    try {
        const item = globalCatalogue[index];
        if(!item) return;

        currentBasePrice = parseInt(item.Prix) || 0;
        currentBaseWeight = parseInt(item.Poids) || 0;
        currentItemStatut = item.Statut || "";
        
		const nomLC = item.Nom ? String(item.Nom).toLowerCase() : "";
        isCurrentItemAccessory = (item.Categorie && (String(item.Categorie).toLowerCase().includes('accessoire') || String(item.Categorie).toLowerCase().includes('composant')));
        isCurrentItemTestProgram = nomLC.includes('test') || nomLC.includes('essai');
        isCurrentItemWheelConfigurable = !isCurrentItemAccessory && !isCurrentItemTestProgram && !nomLC.includes('bâton') && !nomLC.includes('tri-spoke') && !nomLC.includes('lenticulaire') && !nomLC.includes('disc') && !nomLC.includes('manivelle');

        const isSpecialWheel = nomLC.includes('bâton') || nomLC.includes('tri-spoke') || nomLC.includes('lenticulaire') || nomLC.includes('disc');
        
        const priceLabel = document.getElementById('modal-price-label');
        if(priceLabel) priceLabel.textContent = (isCurrentItemAccessory || isSpecialWheel) ? 'Prix unitaire' : 'Prix (la paire)';

        const titleEl = document.getElementById('modal-title');
        if(titleEl) titleEl.textContent = item.Nom || "Produit";
        
        const descEl = document.getElementById('modal-desc');
        if(descEl) descEl.textContent = item.Description || "Sélectionnez vos options pour ajouter ce produit au panier.";
        
        const hauteurEl = document.getElementById('modal-hauteur');
        if(hauteurEl) hauteurEl.textContent = item.Hauteur || '-';

        const bestsellerBadge = document.getElementById('modal-bestseller');
        if (bestsellerBadge) {
            if (nomLC.includes('50')) {
                bestsellerBadge.classList.remove('hidden');
                bestsellerBadge.classList.add('inline-flex', 'items-center');
            } else {
                bestsellerBadge.classList.add('hidden');
                bestsellerBadge.classList.remove('inline-flex', 'items-center');
            }
        }

        let images = item.Image ? item.Image.split(',') : ['https://images.unsplash.com/photo-1511994298241-608e28f14fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'];
        
        changeModalMedia(images[0].trim());

        const gallery = document.getElementById('modal-gallery');
        if (gallery) {
            if (images.length > 1) {
                gallery.innerHTML = images.map(img => {
                    const url = img.trim();
                    const isVideo = url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm');
                    const iconPlay = isVideo ? `<div class="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition"><i class="fa-solid fa-circle-play text-white text-2xl shadow-sm opacity-90"></i></div>` : '';
                    const mediaTag = isVideo ? `<video src="${url}#t=0.1" class="w-full h-full object-cover"></video>` : `<img src="${url}" class="w-full h-full object-cover">`;
                    
                    return `
                    <div onclick="changeModalMedia('${url}')" class="group cursor-pointer border-2 border-transparent hover:border-brand-main rounded-lg overflow-hidden relative h-20 min-w-[5rem] bg-gray-100 flex-shrink-0 transition-all shadow-sm">
                        ${mediaTag}
                        ${iconPlay}
                    </div>`;
                }).join('');
                gallery.classList.remove('hidden');
            } else {
                gallery.innerHTML = '';
                gallery.classList.add('hidden');
            }
        }
        
        let largeurInt = "24 mm";
        let largeurExt = "32 mm";
        
        if (nomLC.includes('lenticulaire') || nomLC.includes('disc')) {
            largeurInt = "18 mm";
            largeurExt = "25 mm";
        } else if (nomLC.includes('bâton') || nomLC.includes('tri-spoke')) {
            largeurInt = "21 mm";
            largeurExt = "28 mm";
        }

        const larIntEl = document.getElementById('modal-largeur-int');
        if(larIntEl) larIntEl.textContent = largeurInt;
        const larExtEl = document.getElementById('modal-largeur-ext');
        if(larExtEl) larExtEl.textContent = largeurExt;

        const specJantesBox = document.getElementById('spec-jantes-box');
        const poidsMaxContainer = document.getElementById('modal-poids-max-container');
        const configuratorSection = document.getElementById('configurator-section');
        const wheelConfigOptions = document.getElementById('wheel-config-options');
		const manivellesConfigContainer = document.getElementById('config-manivelles-container');
        const accessoryConfigContainer = document.getElementById('accessory-config-container');
        const specialWheelConfigContainer = document.getElementById('special-wheel-config-container');
        const testConfigContainer = document.getElementById('test-program-config-container');
		// FORCER LE MASQUAGE DES MENUS SPÉCIAUX POUR TOUS LES AUTRES PRODUITS
        const blocRatchetSpecial = document.getElementById('bloc-ratchet-special');
        if (blocRatchetSpecial) blocRatchetSpecial.style.display = 'none';
        const blocLargeurSpecial = document.getElementById('bloc-largeur-special');
        if (blocLargeurSpecial) blocLargeurSpecial.style.display = 'none';
		const blocStickerLenti = document.getElementById('bloc-sticker-lenticulaire');
        if (blocStickerLenti) blocStickerLenti.style.display = 'none';
        
		if (isCurrentItemTestProgram) {
            if(specJantesBox) specJantesBox.style.display = 'none';
            if(configuratorSection) configuratorSection.style.display = 'block';
            if(wheelConfigOptions) wheelConfigOptions.style.display = 'none';
            if(manivellesConfigContainer) manivellesConfigContainer.style.display = 'none';
            if(accessoryConfigContainer) accessoryConfigContainer.style.display = 'none';
            if(specialWheelConfigContainer) specialWheelConfigContainer.style.display = 'none';
            if(testConfigContainer) testConfigContainer.style.display = 'block';
            if(poidsMaxContainer) poidsMaxContainer.style.display = 'none';
            
            const cPrice = document.getElementById('calc-price');
            if(cPrice) cPrice.textContent = 50;
            const cWeight = document.getElementById('calc-weight');
            if(cWeight) cWeight.textContent = currentBaseWeight > 0 ? currentBaseWeight : '978';
            updateBadgeUI(false, "Disponible à l'essai");

            const dateInputTest = document.getElementById('config-date-test');
            if(dateInputTest) {
                const aujourdhui = new Date().toISOString().split('T')[0];
                dateInputTest.min = aujourdhui;
            }
            fetchUnavailableTestDates();
            
        } else if (nomLC.includes('manivelle')) {
            if(specJantesBox) specJantesBox.style.display = 'none';
            if(configuratorSection) configuratorSection.style.display = 'block';
            if(wheelConfigOptions) wheelConfigOptions.style.display = 'none';
            if(manivellesConfigContainer) manivellesConfigContainer.style.display = 'block';
            if(accessoryConfigContainer) accessoryConfigContainer.style.display = 'none';
			if(specialWheelConfigContainer) specialWheelConfigContainer.style.display = 'none';
            if(testConfigContainer) testConfigContainer.style.display = 'none';
            
            const cPrice = document.getElementById('calc-price');
            if(cPrice) cPrice.textContent = currentBasePrice > 0 ? currentBasePrice : '--';
            const cWeight = document.getElementById('calc-weight');
            if(cWeight) cWeight.textContent = currentBaseWeight > 0 ? currentBaseWeight : '--';
            updateBadgeUI(true);
		} else if (isCurrentItemAccessory) {
            if(specJantesBox) specJantesBox.style.display = 'none';
            if(configuratorSection) configuratorSection.style.display = 'block';
            if(wheelConfigOptions) wheelConfigOptions.style.display = 'none';
            if(manivellesConfigContainer) manivellesConfigContainer.style.display = 'none';
			if(specialWheelConfigContainer) specialWheelConfigContainer.style.display = 'none';
            if(testConfigContainer) testConfigContainer.style.display = 'none';
            if(poidsMaxContainer) poidsMaxContainer.style.display = 'none';
            
            if(accessoryConfigContainer) accessoryConfigContainer.style.display = 'block';
            
            const tailleContainer = document.getElementById('config-taille-pneu-container');
            const tailleSelect = document.getElementById('config-taille-pneu');
            const galferContainer = document.getElementById('galfer-config-container');
            
            if (nomLC.includes('disque')) {
                if(tailleContainer) tailleContainer.style.display = 'none';
                if(galferContainer) galferContainer.style.display = 'block';
            } else if(tailleContainer && tailleSelect) {
                if(galferContainer) galferContainer.style.display = 'none';
                
                if (item.Variantes) {
                    tailleSelect.innerHTML = '';
                    const variantesList = item.Variantes.split(',');
                    variantesList.forEach(v => {
                        const parts = v.split(':');
                        const nomVar = parts[0].trim();
                        const statVar = parts.length > 1 ? parts[1].trim() : '';
                        const opt = document.createElement('option');
                        opt.value = nomVar;
                        opt.textContent = nomVar; 
                        opt.setAttribute('data-statut', statVar);
                        tailleSelect.appendChild(opt);
                    });
                    tailleContainer.style.display = 'block';
                } else if (nomLC.includes('pneu') || nomLC.includes('gp5000')) {
                    tailleSelect.innerHTML = `
                        <option value="30 mm" data-statut="En Stock">30 mm</option>
                        <option value="28 mm" data-statut="Sur Commande">28 mm</option>
                    `;
                    tailleContainer.style.display = 'block';
                } else {
                    tailleContainer.style.display = 'none';
				}
			}
			
            const qteEl = document.getElementById('config-quantite');
            if(qteEl) qteEl.value = '1';
            
            updateConfig();
		} else if (isCurrentItemWheelConfigurable) {
            if(specJantesBox) specJantesBox.style.display = 'block';
            if(configuratorSection) configuratorSection.style.display = 'block';
            if(wheelConfigOptions) wheelConfigOptions.style.display = 'block';
            if(manivellesConfigContainer) manivellesConfigContainer.style.display = 'none';
            if(accessoryConfigContainer) accessoryConfigContainer.style.display = 'none';
            if(poidsMaxContainer) poidsMaxContainer.style.display = 'block';
			if(specialWheelConfigContainer) specialWheelConfigContainer.style.display = 'none';
            if(testConfigContainer) testConfigContainer.style.display = 'none';
            
            const optUxl = document.getElementById('opt-uxl');
            if (optUxl) {
                if (nomLC.includes('75') || nomLC.includes('80')) {
                    optUxl.setAttribute('data-weight-diff', '40');
                    optUxl.textContent = 'UXL (Ultra-Light) - Renforcée [+40g]';
                } else {
                    optUxl.setAttribute('data-weight-diff', '30');
                    optUxl.textContent = 'UXL (Ultra-Light) - Renforcée [+30g]';
                }
            }
            
            const mHub = document.getElementById('config-moyeu');
            if(mHub) { mHub.value = 'R2'; lastHubSelected = 'R2'; }
            
            const mJante = document.getElementById('config-jante');
            if(mJante) mJante.value = 'UXL';
            const mRayons = document.getElementById('config-rayons');
            if(mRayons) mRayons.value = 'T33';
            const mFinition = document.getElementById('config-finition');
            if(mFinition) mFinition.value = 'Glossy Black'; 
            const mLogos = document.getElementById('config-logos');
            if(mLogos) mLogos.value = 'Petit logo noir';
            const mRouelibre = document.getElementById('config-rouelibre');
            if(mRouelibre) mRouelibre.value = 'Shimano HG';
            const mFreinage = document.getElementById('config-freinage');
            if(mFreinage) mFreinage.value = 'Disques';
            
            // Réinitialiser les 3 menus déroulants (Étapes 10, 11, 12)
            const mPneus = document.getElementById('config-pneus');
            if(mPneus) mPneus.value = 'Aucun';
            const mBidons = document.getElementById('config-bidons');
            if(mBidons) mBidons.value = 'Aucun';
            const mTpu = document.getElementById('config-tpu');
            if(mTpu) mTpu.value = 'Aucun';
            
            updateHubOptions(); 
            const cColor = document.getElementById('config-couleur-moyeu');
            if(cColor) cColor.value = 'Noir'; 
            
            updateConfig(); 
        } else if (isSpecialWheel) {
            const groupeRouelibre = document.getElementById('groupe-rouelibre-special');
            if (groupeRouelibre) {
                if (nomLC.includes('bâton') || nomLC.includes('tri-spoke')) {
                    groupeRouelibre.style.display = 'none'; // Cache pour la roue avant
                } else {
                    groupeRouelibre.style.display = 'block'; // Affiche pour la lenticulaire
                }
            }
			// --- INJECTION DES VERSIONS (STD, XL, UXL, RUXL...) ---
            const gammeSelect = document.getElementById('config-gamme-special');
            if (gammeSelect) {
                gammeSelect.innerHTML = '';
                if (nomLC.includes('lenticulaire') || nomLC.includes('disc')) {
                    gammeSelect.innerHTML = `
                        <option value="Série STD" data-price="0" data-weight-diff="0">Série STD (Moyeu 36T) - 1050g [+0€]</option>
                        <option value="Série XL" data-price="100" data-weight-diff="-70">Série XL (Moyeu 36T) - 980g [+100€]</option>
                        <option value="Série UXL" data-price="200" data-weight-diff="-150">Série UXL (Moyeu 54T) - 900g [+200€]</option>
                        <option value="Série RUXL" data-price="250" data-weight-diff="-150">Série RUXL (Moyeu SSF) - 900g [+250€]</option>
                    `;
                } else if (nomLC.includes('bâton') || nomLC.includes('tri-spoke')) {
                    gammeSelect.innerHTML = `
                        <option value="Série STD" data-price="0" data-weight-diff="0">Série STD - 880g [+0€]</option>
                        <option value="Série XL" data-price="100" data-weight-diff="-80">Série XL (Ultra-Léger) - 800g [+100€]</option>
                    `;
                }
            }
            // ------------------------------------------------
			if(specJantesBox) specJantesBox.style.display = 'block';
            if(configuratorSection) configuratorSection.style.display = 'block';
            if(wheelConfigOptions) wheelConfigOptions.style.display = 'none';
            if(manivellesConfigContainer) manivellesConfigContainer.style.display = 'none';
            if(accessoryConfigContainer) accessoryConfigContainer.style.display = 'none';
            if(specialWheelConfigContainer) specialWheelConfigContainer.style.display = 'block';
            if(testConfigContainer) testConfigContainer.style.display = 'none';
            if(poidsMaxContainer) poidsMaxContainer.style.display = 'none';
            
            const cPrice = document.getElementById('calc-price');
            if(cPrice) cPrice.textContent = currentBasePrice > 0 ? currentBasePrice : '--';
            const cWeight = document.getElementById('calc-weight');
            if(cWeight) cWeight.textContent = currentBaseWeight > 0 ? currentBaseWeight : '--';
            updateBadgeUI(true);
            
            // --- AJOUT : FORCER L'AFFICHAGE IMMÉDIAT ---
            const largeurSpecialSelect = document.getElementById('config-largeur-special');
            if (largeurSpecialSelect) largeurSpecialSelect.value = '21/28mm'; // Reset par défaut
            updateConfig(); // Réveille le cerveau pour afficher les menus !
            // ------------------------------------------
        } else {
            if(specJantesBox) specJantesBox.style.display = 'block';
            if(configuratorSection) configuratorSection.style.display = 'none';
            if(poidsMaxContainer) poidsMaxContainer.style.display = 'none';
            if(specialWheelConfigContainer) specialWheelConfigContainer.style.display = 'none';
            
            const cPrice = document.getElementById('calc-price');
            if(cPrice) cPrice.textContent = currentBasePrice > 0 ? currentBasePrice : '--';
            const cWeight = document.getElementById('calc-weight');
            if(cWeight) cWeight.textContent = currentBaseWeight > 0 ? currentBaseWeight : '--';
            updateBadgeUI(true);
        }

		// Gestion de l'affichage du sélecteur de location
        const blocModeLenti = document.getElementById('bloc-mode-lenticulaire');
        const blocLocationDetails = document.getElementById('bloc-location-details');

        if (nomLC.includes('lenticulaire') || nomLC.includes('disc')) {
            if (blocModeLenti) blocModeLenti.style.display = 'flex';
            setLenticulaireMode('achat'); // Par défaut en mode achat à l'ouverture
        } else {
            if (blocModeLenti) blocModeLenti.style.display = 'none';
            if (blocLocationDetails) blocLocationDetails.style.display = 'none';
        }

		const submitBtn = document.querySelector('button[onclick="addToCart()"]');
        if ((isCurrentItemAccessory || isCurrentItemTestProgram) && currentDeliveryZone === 'metropole') {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.className = "w-full bg-gray-300 text-gray-500 font-bold py-3 rounded-xl flex justify-center items-center gap-3 cursor-not-allowed shrink-0";
                submitBtn.innerHTML = 'Indisponible en Métropole (Retrait Réunion uniquement) <i class="fa-solid fa-ban text-xl"></i>';
            }
        } else {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.className = "w-full bg-brand-accent hover:bg-yellow-400 text-brand-main font-bold py-3 rounded-xl flex justify-center items-center gap-3 transition shadow-lg shrink-0";
                submitBtn.innerHTML = 'Ajouter au panier <i class="fa-solid fa-cart-plus text-xl"></i>';
            }
        }
		
        const pModal = document.getElementById('product-modal');
        if (pModal) {
            pModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    } catch(e) {
        console.error("Erreur openModal:", e);
        alert("Erreur lors de l'ouverture. Veuillez rafraîchir la page (F5).");
    }
}

function closeModal() {
    document.getElementById('product-modal').classList.add('hidden');
    document.body.style.overflow = 'auto'; 
    
    const vidEl = document.getElementById('modal-video');
    if(vidEl) {
        try { vidEl.pause(); } catch(e) {}
    }
}

function changeModalMedia(url) {
    try {
        const imgEl = document.getElementById('modal-image');
        const vidEl = document.getElementById('modal-video');

        if (!url) return;

        if (url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm')) {
            if (imgEl) imgEl.classList.add('hidden');
            if (vidEl) {
                vidEl.classList.remove('hidden');
                vidEl.src = url;
                vidEl.muted = false;
                vidEl.volume = 0.5;

                let playPromise = vidEl.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.log("Autoplay bloqué, passage en muet.");
                        vidEl.muted = true;
                        vidEl.play().catch(e => console.log(e));
                    });
                }
            }
        } else {
            if (vidEl) {
                vidEl.classList.add('hidden');
                try { vidEl.pause(); } catch(e) {}
            }
            if (imgEl) {
                imgEl.classList.remove('hidden');
                imgEl.src = url;
            }
        }
    } catch(e) {
        console.error("Erreur changeModalMedia:", e);
    }
}

function updateConfig() {
    const titleEl = document.getElementById('modal-title');
    const titleLC = titleEl ? titleEl.textContent.toLowerCase() : "";

    const cWeightSpan = document.getElementById('calc-weight');
    if (cWeightSpan && cWeightSpan.parentElement && cWeightSpan.parentElement.parentElement) {
        const weightBlock = cWeightSpan.parentElement.parentElement;
        if (isCurrentItemAccessory && currentBaseWeight <= 0 && !titleLC.includes('manivelle') && !titleLC.includes('axe')) {
            weightBlock.style.visibility = 'hidden';
        } else {
            weightBlock.style.visibility = 'visible';
        }
    }

    const toleranceSpan = document.getElementById('weight-tolerance');
    if (toleranceSpan) {
        toleranceSpan.textContent = (isCurrentItemAccessory || !isCurrentItemWheelConfigurable) ? '(+/- 5g)' : '(+/- 30g)';
    }

    if (isCurrentItemAccessory) {
        const qteEl = document.getElementById('config-quantite');
        const qte = qteEl ? parseInt(qteEl.value) : 1;
        
        let finalPrice = currentBasePrice * qte;
        
        if (titleLC.includes('bidon') || titleLC.includes('ahyka')) {
            const pairs = Math.floor(qte / 2);
            const singles = qte % 2;
            finalPrice = (pairs * 75) + (singles * currentBasePrice); 
        }
        
        let finalWeight = currentBaseWeight * qte;
		
        // --- GESTION DYNAMIQUE PRIX/POIDS DES DISQUES ---
        if (titleLC.includes('disque')) {
            const modeleSelect = document.getElementById('config-galfer-modele');
            const tailleSelect = document.getElementById('config-galfer-taille');
            
            let unitPrice = currentBasePrice; // Prix catalogue par défaut (65)
            if (modeleSelect) {
                unitPrice = parseInt(modeleSelect.options[modeleSelect.selectedIndex].getAttribute('data-price')) || 65;
            }
            finalPrice = unitPrice * qte;
            
            if (tailleSelect && modeleSelect) {
                const isShark = modeleSelect.value.includes('Shark');
                if (tailleSelect.value.includes('160mm')) {
                    finalWeight = (isShark ? 104 : 98) * qte;
                } else {
                    finalWeight = (isShark ? 90 : 76) * qte;
                }
            }
        }
        // ----------------------------------------------
        
        // --- GESTION DYNAMIQUE DES MANIVELLES ---
        if (titleLC.includes('manivelle')) {
            const modeleSelect = document.getElementById('config-modele-manivelle');
            const plateauxSelect = document.getElementById('config-plateaux-manivelle');
            const dentureContainer = document.getElementById('config-denture-container');
            
            // Ajout du prix des plateaux/étoile au total
            let plateauxPrice = 0;
            let plateauxWeight = 0;
            if (plateauxSelect && plateauxSelect.selectedIndex >= 0) {
                plateauxPrice = parseInt(plateauxSelect.options[plateauxSelect.selectedIndex].getAttribute('data-price')) || 0;
                plateauxWeight = parseInt(plateauxSelect.options[plateauxSelect.selectedIndex].getAttribute('data-weight')) || 0;
                
                // Afficher/Cacher le choix de la denture selon l'option sélectionnée
                const selectedPlateauxValue = plateauxSelect.value;
                if (dentureContainer) {
                    // On n'affiche la denture QUE s'il choisit un "Pack Complet" ou le "Capteur + Plateaux"
                    if (selectedPlateauxValue.includes('Pack Complet') || selectedPlateauxValue.includes('Capteur XCADEY + Plateaux')) {
                        dentureContainer.style.display = 'block';
                    } else {
                        dentureContainer.style.display = 'none';
                    }
                }
            }
            
            // Nouveau calcul du prix
            finalPrice = (currentBasePrice + plateauxPrice) * qte;
            
            // Mise à jour des specs (Poids, Q-Factor, Axe)
            if (modeleSelect && modeleSelect.selectedIndex >= 0) {
                const selectedOption = modeleSelect.options[modeleSelect.selectedIndex];
                
                const baseManivelleWeight = parseInt(selectedOption.getAttribute('data-crank-weight')) || 290;
                finalWeight = (baseManivelleWeight + plateauxWeight) * qte;
                
                const techAxis = document.getElementById('tech-axis');
                const techQfactor = document.getElementById('tech-qfactor');
                const techMaterial = document.getElementById('tech-material');
                
                if (techAxis) techAxis.textContent = selectedOption.getAttribute('data-axis') || "";
                if (techQfactor) techQfactor.textContent = selectedOption.getAttribute('data-qfactor') || "";
                if (techMaterial) techMaterial.textContent = selectedOption.getAttribute('data-material') || "";
            }
        }
        // --------------------------------------------------
        
        const cPrice = document.getElementById('calc-price');
        if(cPrice) cPrice.textContent = finalPrice > 0 ? finalPrice : '--';
        
        if(cWeightSpan) {
            if (currentBaseWeight > 0 || titleLC.includes('manivelle') || titleLC.includes('axe') || titleLC.includes('disque') || titleLC.includes('galfer')) {
                cWeightSpan.textContent = finalWeight > 0 ? finalWeight : '--';
            } else {
                cWeightSpan.textContent = '--';
            }
        }

        const tailleSelect = document.getElementById('config-taille-pneu');
        const tailleContainer = document.getElementById('config-taille-pneu-container');
        
        let customStatut = null;
        if (tailleContainer && tailleContainer.style.display !== 'none' && tailleSelect && tailleSelect.selectedIndex >= 0) {
            customStatut = tailleSelect.options[tailleSelect.selectedIndex].getAttribute('data-statut');
        }

        updateBadgeUI(true, customStatut);
        
        return; 
    }

    // --- GESTION DU PRIX DES ROUES SPÉCIALES (BÂTONS / LENTICULAIRES) ---
    const isSpecialWheel = titleLC.includes('bâton') || titleLC.includes('tri-spoke') || titleLC.includes('lenticulaire') || titleLC.includes('disc');
    
    if (isSpecialWheel) {
        const gammeSelect = document.getElementById('config-gamme-special');
        const gammeVal = gammeSelect ? gammeSelect.value : "";
        
        let finalPrice = currentBasePrice;
        let finalWeight = currentBaseWeight;
        let ratchetPrice = 0;
		let gammePrice = 0;
		let gammeWeightDiff = 0;

        if (currentLenticulaireMode === 'location') {
            const selectMontage = document.getElementById('config-montage-location');
            const montagePrice = selectMontage && selectMontage.selectedIndex >= 0 ? (parseInt(selectMontage.options[selectMontage.selectedIndex].getAttribute('data-price')) || 0) : 0;
            
            finalPrice = 100 + montagePrice; // Tarif de base de 100€ + option de montage
            finalWeight = 980; // Poids fixe de ta jante de location
            updateBadgeUI(false, "Disponible à la location");
        } else {
            gammePrice = gammeSelect && gammeSelect.selectedIndex >= 0 ? (parseInt(gammeSelect.options[gammeSelect.selectedIndex].getAttribute('data-price')) || 0) : 0;
            gammeWeightDiff = gammeSelect && gammeSelect.selectedIndex >= 0 ? (parseInt(gammeSelect.options[gammeSelect.selectedIndex].getAttribute('data-weight-diff')) || 0) : 0;
            
            finalPrice = currentBasePrice + gammePrice;
            finalWeight = currentBaseWeight + gammeWeightDiff;
        }

        // Gestion de l'affichage dynamique du Ratchet pour RUXL
        const blocRatchetSpecial = document.getElementById('bloc-ratchet-special');
        const ratchetSpecialSelect = document.getElementById('config-ratchet-special');
        
        if (blocRatchetSpecial && ratchetSpecialSelect) {
            if (gammeVal === 'Série RUXL') {
                blocRatchetSpecial.style.display = 'block';
                ratchetPrice = parseInt(ratchetSpecialSelect.options[ratchetSpecialSelect.selectedIndex].getAttribute('data-price')) || 0;
            } else {
                blocRatchetSpecial.style.display = 'none';
                ratchetSpecialSelect.selectedIndex = 0; // Remet à 45T par défaut
            }
        }

        // Gestion des largeurs pour Lenticulaire (Blocage 19/26 sur UXL/RUXL)
        const blocLargeurSpecial = document.getElementById('bloc-largeur-special');
        const largeurSpecialSelect = document.getElementById('config-largeur-special');
        
        if (titleLC.includes('lenticulaire') || titleLC.includes('disc')) {
            if (blocLargeurSpecial) blocLargeurSpecial.style.display = 'block';
			const blocStickerLenti = document.getElementById('bloc-sticker-lenticulaire');
            if (blocStickerLenti) blocStickerLenti.style.display = 'block';
            
            if (largeurSpecialSelect) {
                const opt19 = largeurSpecialSelect.querySelector('option[value="19/26mm"]');
                if (opt19) {
                    if (gammeVal === 'Série UXL' || gammeVal === 'Série RUXL') {
                        opt19.disabled = true;
                        opt19.textContent = '19/26mm (Indisponible sur UXL/RUXL)';
                        if (largeurSpecialSelect.value === '19/26mm') largeurSpecialSelect.value = '21/28mm';
                    } else {
                        opt19.disabled = false;
                        opt19.textContent = '19mm Int. / 26mm Ext.';
                    }
                }
                
                // Mise à jour des specs bleues en haut du Modal
                const larIntEl = document.getElementById('modal-largeur-int');
                const larExtEl = document.getElementById('modal-largeur-ext');
                if(larIntEl && larExtEl) {
                    const parts = largeurSpecialSelect.value.split('/');
                    if(parts.length === 2) {
                        larIntEl.textContent = parts[0].replace('mm', ' mm');
                        larExtEl.textContent = parts[1].replace('mm', ' mm');
                    }
                }
            }
        } else {
            if (blocLargeurSpecial) blocLargeurSpecial.style.display = 'none';
        }

        const cPrice = document.getElementById('calc-price');
        if(cPrice) cPrice.textContent = finalPrice > 0 ? finalPrice : '--';
        if(cWeightSpan) cWeightSpan.textContent = finalWeight > 0 ? finalWeight : '--';
        
        updateBadgeUI(gammePrice === 0 && ratchetPrice === 0); 
        return; // On stoppe le calcul ici pour les roues spéciales !
    }

    // Sécurité pour la suite du code (Roues classiques)
    if (!isCurrentItemWheelConfigurable) return; 

    const moyeuSelect = document.getElementById('config-moyeu');
    const janteSelect = document.getElementById('config-jante');
    const rayonSelect = document.getElementById('config-rayons');
    const ratchetSelect = document.getElementById('config-ratchet');
    const roulementsSelect = document.getElementById('config-roulements');
    const finitionSelect = document.getElementById('config-finition');
	const colorSelect = document.getElementById('config-couleur-moyeu');
    const disquesSelect = document.getElementById('config-disques');
    const disquesContainer = document.getElementById('config-disques-container');
    const freinageSelect = document.getElementById('config-freinage');

    // Masquer l'option disques si le client choisit des freins à patins
    if (freinageSelect && disquesContainer) {
        if (freinageSelect.value === 'Patins') {
            disquesContainer.style.display = 'none';
            if (disquesSelect) disquesSelect.value = 'Aucun';
        } else {
            disquesContainer.style.display = 'block';
        }
    }
    const disquesPrice = disquesSelect && disquesSelect.selectedIndex >= 0 ? (parseInt(disquesSelect.options[disquesSelect.selectedIndex].getAttribute('data-price')) || 0) : 0;
    
    const pneusSelect = document.getElementById('config-pneus');
    const bidonsSelect = document.getElementById('config-bidons');
    const tpuSelect = document.getElementById('config-tpu');

    const optT52Interne = document.getElementById('opt-t52-interne');
    if (optT52Interne && moyeuSelect) {
        if (moyeuSelect.value === 'R2') {
            optT52Interne.setAttribute('data-price', '159');
            optT52Interne.textContent = 'Carbone T52 + Écrous Internes [+159€]';
        } else {
            optT52Interne.setAttribute('data-price', '99');
            optT52Interne.textContent = 'Carbone T52 + Écrous Internes [+99€]';
        }
    }
    
    const larIntEl = document.getElementById('modal-largeur-int');
    const larExtEl = document.getElementById('modal-largeur-ext');
    if (freinageSelect && larIntEl && larExtEl) {
        if (freinageSelect.value === 'Patins') {
            larIntEl.textContent = '21 mm';
            larExtEl.textContent = '28 mm';
        } else {
            larIntEl.textContent = '24 mm';
            larExtEl.textContent = '32 mm';
        }
    }

	const plaquettesSelect = document.getElementById('config-plaquettes');
    const cassettesSelect = document.getElementById('config-cassettes');
    
    const msgRecoR2 = document.getElementById('msg-reco-r2');
    const t32Option = document.getElementById('opt-t32');
    const patinsOption = freinageSelect ? Array.from(freinageSelect.options).find(opt => opt.value === 'Patins') : null;
    const suxlOption = janteSelect ? Array.from(janteSelect.options).find(opt => opt.value === 'SUXL') : null;

    if (moyeuSelect && moyeuSelect.value === 'R2') {
        if(msgRecoR2) msgRecoR2.style.display = 'flex';
        if(t32Option) {
            t32Option.disabled = true;
            t32Option.textContent = 'Carbone T32 (Incompatible avec moyeu R2)';
        }
        if (rayonSelect && rayonSelect.value === 'T32') {
            rayonSelect.value = 'T33';
        }
        if (suxlOption) {
            suxlOption.disabled = true;
            suxlOption.textContent = 'SUXL (Incompatible avec moyeu R2)';
        }
        if (janteSelect && janteSelect.value === 'SUXL') {
            janteSelect.value = 'UXL';
        }
        if (patinsOption) {
            patinsOption.disabled = false;
            patinsOption.textContent = 'Freins à Patins (Bande Haute Température)';
        }
    } else {
        if(msgRecoR2) msgRecoR2.style.display = 'none';
        if(t32Option) {
            t32Option.disabled = false;
            t32Option.textContent = 'Carbone T32 (Aéro pur, 3.2 x 0.98mm - 2.1g)';
        }
        if (suxlOption) {
            suxlOption.disabled = false;
            suxlOption.textContent = 'SUXL (Super Ultra-Light)';
        }
        if (patinsOption) {
            patinsOption.disabled = true;
            patinsOption.textContent = 'Freins à Patins (Incompatible avec RT240)';
        }
        if (freinageSelect && freinageSelect.value === 'Patins') {
            freinageSelect.value = 'Disques';
        }
    }
    
    const getPrice = (el) => {
        if(!el || el.selectedIndex < 0) return 0;
        return parseInt(el.options[el.selectedIndex].getAttribute('data-price')) || 0;
    };

    const greenBox = document.getElementById('green-accessory-box');
    if (greenBox) {
        if (currentDeliveryZone === 'metropole') {
            greenBox.style.display = 'none';
            // Force les valeurs d'accessoires à zéro pour ne pas fausser le prix
            if (pneusSelect) pneusSelect.value = 'Aucun';
            if (bidonsSelect) bidonsSelect.value = 'Aucun';
            if (tpuSelect) tpuSelect.value = 'Aucun';
            if (disquesSelect) disquesSelect.value = 'Aucun';
            if (plaquettesSelect) plaquettesSelect.value = 'Aucun';
            if (cassettesSelect) cassettesSelect.value = 'Aucune';
        } else {
            greenBox.style.display = 'block';
        }
    }
	
    const moyeuPrice = getPrice(moyeuSelect);
    const rayonPrice = getPrice(rayonSelect);
    const colorPrice = getPrice(colorSelect);
    const ratchetPrice = getPrice(ratchetSelect);
    const roulementsPrice = getPrice(roulementsSelect);
    const finitionPrice = getPrice(finitionSelect);

    // --- AJOUT : ON RÉCUPÈRE LE PRIX DES PLAQUETTES ---
    const plaquettesPrice = plaquettesSelect && plaquettesSelect.selectedIndex >= 0 ? (parseInt(plaquettesSelect.options[plaquettesSelect.selectedIndex].getAttribute('data-price')) || 0) : 0;
	
    const pneusPrice = getPrice(pneusSelect);
    const bidonsPrice = getPrice(bidonsSelect);
    const tpuPrice = getPrice(tpuSelect);
    const accessoiresPrice = pneusPrice + bidonsPrice + tpuPrice;
    
    const hubWeight = moyeuSelect && moyeuSelect.selectedIndex >= 0 ? (parseInt(moyeuSelect.options[moyeuSelect.selectedIndex].getAttribute('data-hub-weight')) || 238) : 238;
    const spokeCount = moyeuSelect && moyeuSelect.selectedIndex >= 0 ? (parseInt(moyeuSelect.options[moyeuSelect.selectedIndex].getAttribute('data-spokes')) || 40) : 40;
    const rimDiff = janteSelect && janteSelect.selectedIndex >= 0 ? (parseInt(janteSelect.options[janteSelect.selectedIndex].getAttribute('data-weight-diff')) || 0) : 0;
    const finitionWeight = finitionSelect && finitionSelect.selectedIndex >= 0 ? (parseInt(finitionSelect.options[finitionSelect.selectedIndex].getAttribute('data-weight')) || 0) : 0;
    const spokeWeight = rayonSelect && rayonSelect.selectedIndex >= 0 ? (parseFloat(rayonSelect.options[rayonSelect.selectedIndex].getAttribute('data-spoke-weight')) || 2.1) : 2.1;
    
    const freinageWeight = freinageSelect && freinageSelect.value === 'Patins' ? 130 : 0;

    const finalPrice = currentBasePrice + moyeuPrice + rayonPrice + finitionPrice + colorPrice + ratchetPrice + roulementsPrice + accessoiresPrice + disquesPrice + plaquettesPrice;
    
    const baseComboWeight = 322; 
    const newComboWeight = hubWeight + (spokeCount * spokeWeight) + rimDiff + finitionWeight + freinageWeight;
    const finalWeight = Math.round(currentBaseWeight - baseComboWeight + newComboWeight);

    const cPrice = document.getElementById('calc-price');
    if(cPrice) cPrice.textContent = finalPrice > 0 ? finalPrice : '--';
    if(cWeightSpan) cWeightSpan.textContent = finalWeight > 0 ? finalWeight : '--';
    
    const poidsMaxSpan = document.getElementById('modal-poids-max');
    if (poidsMaxSpan && janteSelect) {
        poidsMaxSpan.textContent = janteSelect.value === 'UXL' ? '120 kg' : '90 kg';
    }

    let isStockConfig = true;
    if (moyeuSelect && moyeuSelect.value !== 'R2') isStockConfig = false;
    if (colorSelect && colorSelect.value !== 'Noir') isStockConfig = false;
    if (janteSelect && janteSelect.value !== 'SUXL') isStockConfig = false;
    if (rayonSelect && rayonSelect.value !== 'T33') isStockConfig = false;
    if (ratchetSelect && ratchetSelect.value !== '45T') isStockConfig = false;
    if (roulementsSelect && roulementsSelect.value !== 'Acier EZO') isStockConfig = false;
    
    const rouelibreSelect = document.getElementById('config-rouelibre');
    if (rouelibreSelect && rouelibreSelect.value !== 'Shimano HG') isStockConfig = false;
    if (finitionSelect && finitionSelect.value !== 'Glossy Black') isStockConfig = false;
    const logoSelect = document.getElementById('config-logos');
    if (logoSelect && logoSelect.value !== 'Petit logo noir') isStockConfig = false;
    if (freinageSelect && freinageSelect.value !== 'Disques') isStockConfig = false; 

    updateBadgeUI(isStockConfig);
}

// --- Logique du Menu Mobile ---
const btnMenu = document.getElementById('mobile-menu-btn');
const menuMobile = document.getElementById('mobile-menu');

if(btnMenu) {
    btnMenu.addEventListener('click', () => {
        if(menuMobile) menuMobile.classList.toggle('hidden');
        const icon = btnMenu.querySelector('i');
        if(icon) {
            if(menuMobile && menuMobile.classList.contains('hidden')) {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            } else {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-xmark');
            }
        }
    });
}

function closeMobileMenu() {
    if(menuMobile) {
        menuMobile.classList.add('hidden');
        const icon = btnMenu ? btnMenu.querySelector('i') : null;
        if(icon) {
            icon.classList.remove('fa-xmark');
            icon.classList.add('fa-bars');
        }
    }
}

function setLenticulaireMode(mode) {
    currentLenticulaireMode = mode;
    const btnAchat = document.getElementById('btn-mode-achat');
    const btnLocation = document.getElementById('btn-mode-location');
    const blocLocationDetails = document.getElementById('bloc-location-details');
    const blocGamme = document.getElementById('config-gamme-special');
    const selectFreinage = document.getElementById('config-freinage-special');
	const selectLargeur = document.getElementById('config-largeur-special');
    const selectSticker = document.getElementById('config-sticker-lenticulaire');
    
    // Configurer le calendrier de location
    const dateInput = document.getElementById('config-date-location');
    if (dateInput) {
        // Date de livraison de la 1ère roue : vendredi 26 juin 2026
        const dateDispoInitiale = "2026-06-26"; 
        const aujourdhui = new Date().toISOString().split('T')[0];
        
        // Si aujourd'hui est avant la livraison, la date minimale est le 26 juin 2026
        if (aujourdhui < dateDispoInitiale) {
            dateInput.min = dateDispoInitiale;
        } else {
            dateInput.min = aujourdhui;
        }
    }
    
    if (mode === 'location') {
        // Style bouton actif Location (vert)
        if(btnAchat) btnAchat.className = "flex-1 text-center py-2 text-xs font-bold rounded-lg text-gray-500 hover:text-brand-main transition-all uppercase tracking-wider";
        if(btnLocation) btnLocation.className = "flex-1 text-center py-2 text-xs font-black rounded-lg bg-green-600 text-white shadow-md transition-all uppercase tracking-wider";
        
        // Afficher l'encart complet de location (date + conditions)
        if (blocLocationDetails) blocLocationDetails.style.display = 'block';
        
        // Verrouiller la gamme sur la version de ta flotte de location (Série STD)
        if (blocGamme) {
            blocGamme.value = "Série XL";
            blocGamme.disabled = true; 
        }

        // Verrouiller obligatoirement sur "Disques" pour la location
        if (selectFreinage) {
            selectFreinage.value = "Freins à Disques";
            selectFreinage.disabled = true;
        }

		// Verrouiller la largeur sur 24.5/30mm pour la flotte de location
        if (selectLargeur) {
            selectLargeur.value = "24.5/30mm";
            selectLargeur.disabled = true;
        }

        // Verrouiller obligatoirement avec le sticker Karbòn Péi d'origine
        if (selectSticker) {
            selectSticker.value = "Avec Sticker";
            selectSticker.disabled = true;
        }
        
        // Charger les indisponibilités depuis le Sheet
        fetchUnavailableDates();
    } else {
        // Style bouton actif Achat
        if(btnAchat) btnAchat.className = "flex-1 text-center py-2 text-xs font-black rounded-lg bg-brand-main text-white shadow transition-all uppercase tracking-wider";
        if(btnLocation) btnLocation.className = "flex-1 text-center py-2 text-xs font-bold rounded-lg text-gray-500 hover:text-brand-main transition-all uppercase tracking-wider";
        
        // Masquer l'encart et débloquer les options pour l'achat
        if (blocLocationDetails) blocLocationDetails.style.display = 'none';
        if (blocGamme) blocGamme.disabled = false;
        if (selectFreinage) selectFreinage.disabled = false;
		if (selectLargeur) selectLargeur.disabled = false;
        if (selectSticker) selectSticker.disabled = false;
		const selectMontage = document.getElementById('config-montage-location');
        if (selectMontage) selectMontage.value = "Sans Montage";
        
        // Masquer l'alerte d'indisponibilité si elle était affichée
        const alertEpuise = document.getElementById('alert-location-epuisee');
        if (alertEpuise) alertEpuise.classList.add('hidden');
        
        // Débloquer le bouton d'ajout au panier
        const submitBtn = document.querySelector('button[onclick="addToCart()"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    updateConfig();
}

async function fetchUnavailableDates() {
    try {
        const response = await fetch(`${API_URL}?action=getUnavailableDates`);
        unavailableRentalDates = await response.json();
        checkDateAvailability(); // Vérifie la date sélectionnée
    } catch (error) {
        console.error("Impossible de charger le calendrier de location :", error);
    }
}

function checkDateAvailability() {
    if (currentLenticulaireMode !== 'location') return;
    
    const dateInput = document.getElementById('config-date-location');
    const alertEpuise = document.getElementById('alert-location-epuisee');
    const submitBtn = document.querySelector('button[onclick="addToCart()"]');
    
    if (!dateInput || !submitBtn) return;
    
    const dateSelectionnee = getFridayOfWeek(dateInput.value);
    
    // Si le week-end est complet (2 jantes déjà réservées)
    if (dateSelectionnee && unavailableRentalDates.includes(dateSelectionnee)) {
        if (alertEpuise) {
            alertEpuise.classList.remove('hidden');
            alertEpuise.classList.add('flex');
        }
        // Bloquer l'ajout au panier !
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        if (alertEpuise) alertEpuise.classList.add('hidden');
        // Débloquer le bouton
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

async function fetchUnavailableTestDates() {
    try {
        // En attendant une liaison Google Sheet complète pour le test,
        // on initialise la liste à vide. (Sera connecté plus tard si besoin)
        unavailableTestDates = []; 
        checkTestDateAvailability();
    } catch (error) {
        console.error("Impossible de charger le calendrier d'essai :", error);
    }
}

function checkTestDateAvailability() {
    if (!isCurrentItemTestProgram) return;
    
    const dateInput = document.getElementById('config-date-test');
    const alertEpuise = document.getElementById('alert-test-epuisee');
    const submitBtn = document.querySelector('button[onclick="addToCart()"]');
    
    if (!dateInput || !submitBtn) return;
    
    const dateSelectionnee = getFridayOfWeek(dateInput.value);
    
    if (dateSelectionnee && unavailableTestDates.includes(dateSelectionnee)) {
        if (alertEpuise) {
            alertEpuise.classList.remove('hidden');
            alertEpuise.classList.add('flex');
        }
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        if (alertEpuise) alertEpuise.classList.add('hidden');
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

function setDeliveryZone(zone) {
    currentDeliveryZone = zone;
    const btnReunion = document.getElementById('zone-reunion');
    const btnMetropole = document.getElementById('zone-metropole');
    
    const opt3x = document.querySelector('input[name="payment-method"][value="3x_pei"]')?.parentElement;
    const opt5050 = document.getElementById('option-pay-5050');
    
    if (zone === 'metropole') {
        if (btnReunion) btnReunion.className = "flex-1 py-2 text-xs font-bold rounded-lg bg-white text-gray-700 hover:text-brand-main border border-gray-300 transition-all";
        if (btnMetropole) btnMetropole.className = "flex-1 py-2 text-xs font-black rounded-lg bg-brand-main text-white shadow-sm border border-brand-main transition-all";
        
        if (opt3x) opt3x.classList.add('hidden');
        if (opt5050) { opt5050.classList.remove('hidden'); opt5050.classList.add('flex'); }
        
        const radio3x = document.querySelector('input[name="payment-method"][value="3x_pei"]');
        const radio5050 = document.querySelector('input[name="payment-method"][value="5050_metropole"]');
        if (radio3x && radio3x.checked && radio5050) radio5050.checked = true;
        
        // --- CORRECTION MAJEURE : NETTOYAGE DU CONTENU DE LA CONFIGURATION ---
        let optionsModifiees = false;
        
        cart.forEach(item => {
            if (item.config && !item.isAccessory) {
                const configOriginale = item.config;
                
                // Nettoyage chirurgical de la chaîne de texte des options interdites
                item.config = item.config
                    .replace(/ \| \+ 2x Pneus Continental GP5000 \(Mixte 28\/30\) \[\+115€\]/g, "")
                    .replace(/ \| \+ 2x Pneus Continental GP5000 \(30mm\) \[\+115€\]/g, "")
                    .replace(/ \| \+ 2x Pneus Continental GP5000 \(28mm\) \[\+115€\]/g, "")
                    .replace(/ \| \+ 2x Chambres TPU 65mm \[\+25€\]/g, "")
                    .replace(/ \| \+ 2x Paires Plaquettes SRAM \(Galfer FD513\) \[\+48€\]/g, "")
                    .replace(/ \| \+ 1x Disc Shark 160mm \[\+89€\]/g, "")
                    .replace(/ \| \+ 1x Disc Shark 140mm \[\+70€\]/g, "")
                    .replace(/ \| \+ 2x Disques Galfer Fixed Wave \[\+90€\]/g, "")
                    .replace(/ \| \+ 2x Disques Galfer Shark \[\+159€\]/g, "")
                    .replace(/ \| \+ Cassette [^|]+/g, "")
                    .replace(/ \| \+ Bidon [^|]+/g, "");

                if (item.config !== configOriginale) {
                    optionsModifiees = true;
                    // Recalcul du prix de base de la jante nue en fonction des composants restants
                    if (configOriginale.includes('+115€')) item.price -= 115;
                    if (configOriginale.includes('+25€')) item.price -= 25;
                    if (configOriginale.includes('+48€')) item.price -= 48;
                    if (configOriginale.includes('+159€')) item.price -= 159;
                    if (configOriginale.includes('+89€')) item.price -= 89;
                    if (configOriginale.includes('+70€')) item.price -= 70;
                    if (configOriginale.includes('+90€')) item.price -= 90;
                    
                    // Ajustement du poids visuel estimé
                    item.weight = "990"; // Poids standard de la Ghost 50 nue en jante UXL
                }
            }
        });

		// Filtrage des accessoires commandés seuls (hors jantes) et des programmes d'essai
        let hadTestsOrAcc = false;
        cart = cart.filter(item => {
            const isTest = item.title.toLowerCase().includes('test') || item.title.toLowerCase().includes('essai');
            if (item.isAccessory || isTest) {
                hadTestsOrAcc = true;
                return false;
            }
            return true;
        });

        if (optionsModifiees || hadTestsOrAcc) {
            showCustomAlert("📍 Mode Métropole activé : Les accessoires ou programmes d'essai ont été retirés de votre panier car ils sont réservés aux clients de La Réunion. Le prix a été mis à jour.");
        }
    } else {
        if (btnReunion) btnReunion.className = "flex-1 py-2 text-xs font-black rounded-lg bg-brand-main text-white shadow-sm border border-brand-main transition-all";
        if (btnMetropole) btnMetropole.className = "flex-1 py-2 text-xs font-bold rounded-lg bg-white text-gray-500 hover:text-brand-main border border-gray-300 transition-all";
        
        if (opt3x) opt3x.classList.remove('hidden');
        if (opt5050) { opt5050.classList.add('hidden'); opt5050.classList.remove('flex'); }
        
        const radio5050 = document.querySelector('input[name="payment-method"][value="5050_metropole"]');
        const radio3x = document.querySelector('input[name="payment-method"][value="3x_pei"]');
        if (radio5050 && radio5050.checked && radio3x) radio3x.checked = true;
    }
    updateCartUI();
}

function showCustomAlert(message) {
    const alertModal = document.getElementById('custom-alert-modal');
    const alertText = document.getElementById('custom-alert-text');
    if (alertModal && alertText) {
        alertText.textContent = message;
        alertModal.classList.remove('hidden');
        alertModal.classList.add('flex');
    }
}

function closeCustomAlert() {
    const alertModal = document.getElementById('custom-alert-modal');
    if (alertModal) {
        alertModal.classList.add('hidden');
        alertModal.classList.remove('flex');
    }
}

// Normalise n'importe quelle date du week-end (Ven, Sam, Dim) au Vendredi de ce même week-end
function getFridayOfWeek(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split('-');
    // Création de la date en local
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const day = d.getDay(); // 0: Dimanche, 1: Lundi, ..., 6: Samedi
    
    let daysToFriday = 5 - day;
    if (day === 0) {
        daysToFriday = -2; // CORRECTION : Le dimanche recule de 2 jours pour atteindre le vendredi d'avant
    } else if (day === 6) {
        daysToFriday = -1; // Le samedi recule de 1 jour pour atteindre le vendredi d'avant
    } else if (day >= 1 && day <= 4) {
        // Optionnel : Si un client choisit en semaine (Lun-Jeu), on le rattache aussi au vendredi qui arrive
        daysToFriday = 5 - day;
    }
    
    d.setDate(d.getDate() + daysToFriday);
    
    // Formatage en YYYY-MM-DD
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
}

loadCatalogue();
