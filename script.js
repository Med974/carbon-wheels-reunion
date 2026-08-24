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
let unavailableTestDates = { "50": [], "6065": [] };
let isCurrentItemTestProgram = false;
let isCurrentItemStockReady = false;
let isCurrentItemTextile = false;
let factoryStock = [];

let cart = [];
let appliedPromo = null;
let discountAmount = 0;

let lastHubSelected = "";

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

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
                const slotSelectTest = document.getElementById('config-creneau-test');
                const slotTypeTest = slotSelectTest ? slotSelectTest.value : 'VenDim';
                const dateLoc = dateEl && dateEl.value ? getSlotAnchor(dateEl.value, slotTypeTest) : "Date non précisée";
                const slotLabelTest = SLOT_DEFS[slotTypeTest] ? SLOT_DEFS[slotTypeTest].label : "Vendredi → Dimanche";
                const selectMontageTest = document.getElementById('config-montage-test');
                const montageTextTest = selectMontageTest ? selectMontageTest.value : "Sans Montage";
                const montagePriceTest = selectMontageTest && selectMontageTest.selectedIndex >= 0 ? (parseInt(selectMontageTest.options[selectMontageTest.selectedIndex].getAttribute('data-price')) || 0) : 0;

                const selectModeleTest = document.getElementById('config-modele-test');
                const modeleTextTest = selectModeleTest ? selectModeleTest.value : "GHOST 50mm (Paire)";
                const modeleWeightTest = selectModeleTest && selectModeleTest.selectedIndex >= 0 ? (parseInt(selectModeleTest.options[selectModeleTest.selectedIndex].getAttribute('data-weight')) || 978) : 978;

                const selectCorpsTest = document.getElementById('config-corps-test');
                const corpsTextTest = selectCorpsTest ? selectCorpsTest.value : "Shimano HG";

                configText = `Créneau du : ${dateLoc} (${slotLabelTest}) | ${modeleTextTest}, Glossy, Moyeux RT240, Rayons T32 | Corps : ${corpsTextTest} | Option : ${montageTextTest}`;
                finalPrice = 50 + montagePriceTest;
                finalWeight = modeleWeightTest;
			} else if (isCurrentItemTextile) {
                const typeSelect = document.getElementById('config-textile-type');
                const type = typeSelect ? typeSelect.value : "";
                const coupeSelect = document.getElementById('config-textile-coupe');
                const coupe = coupeSelect ? coupeSelect.value : "";
                const colorSelect = document.getElementById('config-textile-couleur');
                const color = colorSelect ? colorSelect.options[colorSelect.selectedIndex].text : "";
                const sizeSelect = document.getElementById('config-textile-taille');
                const size = sizeSelect ? sizeSelect.value : "";
                const qteSelect = document.getElementById('config-textile-quantite');
                const qte = qteSelect ? parseInt(qteSelect.value) : 1;
                
                const chaussettesSelect = document.getElementById('config-textile-chaussettes');
                const hasChaussettes = chaussettesSelect && chaussettesSelect.selectedIndex > 0;
                
                let chaussettesQte = 0;
                let chaussettesText = "";
                
                if (hasChaussettes) {
                    const sockQteEl = document.getElementById('config-chaussettes-quantite');
                    chaussettesQte = sockQteEl ? parseInt(sockQteEl.value) : 1;
                    chaussettesText = ` | + ${chaussettesQte}x Chaussettes Aéro`;
                }
                
                configText = `Type : ${type} | Coupe : ${coupe} | Couleur : ${color} | Taille : ${size}${chaussettesText} | Quantité : ${qte} (Tarif Lancement)`;
                // On calcule le prix des tenues d'un côté, et le prix des chaussettes de l'autre
                finalPrice = (159 * qte) + (29 * chaussettesQte);
                finalWeight = "--";
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
                
            } else if (isCurrentItemAccessory || titleLC.includes('plateaux pass quest') || titleLC.includes('pack étoile') || titleLC.includes('pack pro')) {
                const qteEl = document.getElementById('config-quantite');
                const qte = qteEl ? parseInt(qteEl.value) : 1;
                if (titleLC.includes('plateaux pass quest') || titleLC.includes('pack étoile') || titleLC.includes('pack pro')) {
                    const dentureEl = document.getElementById('config-denture-plateaux-seuls');
                    const denture = dentureEl ? dentureEl.value : "";
                    const vitesseEl = document.getElementById('config-vitesse-plateaux-seuls');
                    const vitesse = vitesseEl ? vitesseEl.value : "";
                    const lookEl = document.getElementById('config-look-plateaux-seuls');
                    const look = lookEl ? lookEl.value : "";
                    const visserieEl = document.getElementById('config-visserie-plateaux-seuls');
                    const visserie = (visserieEl && visserieEl.selectedIndex > 0) ? ` | ${visserieEl.options[visserieEl.selectedIndex].text.split(' [+')[0]}` : "";
                    configText = `Denture : ${denture} | Vitesses : ${vitesse} | Design : ${look}${visserie} | Quantité : ${qte}`;
                } else if (titleLC.includes('disque')) {
                    const modeleSelect = document.getElementById('config-galfer-modele');
                    const m = modeleSelect ? modeleSelect.options[modeleSelect.selectedIndex].text.split(' [+')[0] : "";
                    const tailleSelect = document.getElementById('config-galfer-taille');
                    const t = tailleSelect ? tailleSelect.value : "";
                    configText = `Modèle : ${m} | Taille : ${t} | Quantité : ${qte}`;
                } else if (titleLC.includes('pneu') || titleLC.includes('gp5000') || titleLC.includes('tpu') || titleLC.includes('chambre') || titleLC.includes('plaquette') || titleLC.includes('lockring')) {
                    const tailleEl = document.getElementById('config-taille-pneu');
                    const taille = tailleEl ? tailleEl.value : "";
                    const prefix = titleLC.includes('lockring') ? 'Couleur' : 'Option';
                    configText = `${prefix} : ${taille} | Quantité : ${qte}`;
                } else {
                    configText = `Quantité : ${qte}`;
                }
            } else if (titleLC.includes('apex') || titleLC.includes('vtt') || titleLC.includes('mtb')) {
                const mtbMoyeuSelect = document.getElementById('config-mtb-moyeu');
                const mtbJanteSelect = document.getElementById('config-mtb-jante');
                const mtbCouleurSelect = document.getElementById('config-mtb-couleur');
                const mtbRatchetSelect = document.getElementById('config-mtb-ratchet');
                const mtbFinitionSelect = document.getElementById('config-mtb-finition');
                const mtbLogoSelect = document.getElementById('config-mtb-logo');
                const mtbRouelibreSelect = document.getElementById('config-mtb-rouelibre');
                const mtbAxeSelect = document.getElementById('config-mtb-axe'); // 15x110 etc
                
                const mtbMoyeuText = mtbMoyeuSelect ? mtbMoyeuSelect.options[mtbMoyeuSelect.selectedIndex].text.split(' ')[0] : 'DMB1';
                const mtbJanteText = mtbJanteSelect ? mtbJanteSelect.value : 'XL';
                
                let extraMtbOptions = '';
                if (mtbMoyeuText === 'DMB2') {
                    const col = mtbCouleurSelect ? mtbCouleurSelect.value : 'Noir';
                    const ratch = mtbRatchetSelect ? mtbRatchetSelect.value : '45T';
                    extraMtbOptions = ` (${col}) | Ratchet ${ratch} | `;
                } else {
                    extraMtbOptions = ` | `;
                }
                
                const mtbFinition = mtbFinitionSelect ? mtbFinitionSelect.value : 'UD Matte';
                const mtbLogo = mtbLogoSelect ? mtbLogoSelect.value : 'Petit logo noir';
                const mtbRL = mtbRouelibreSelect ? mtbRouelibreSelect.value : 'Shimano MicroSpline';
                const mtbAxe = mtbAxeSelect ? mtbAxeSelect.value : 'Boost (15x110 / 12x148)';
                
                const mtbLargeurSelect = document.getElementById('config-mtb-largeur');
                const mtbLargeurText = mtbLargeurSelect ? mtbLargeurSelect.value.split(' (')[0] : '';
                
                configText = `Moyeu ${mtbMoyeuText}${extraMtbOptions}Jante ${mtbJanteText} | Largeur : ${mtbLargeurText} | ${mtbFinition} | Logos : ${mtbLogo} | Corps : ${mtbRL} | Axes : ${mtbAxe}`;

                // Ajout dynamique des accessoires VTT au résumé
                const addMtbAccessoryToConfig = (selectId) => {
                    const selectEl = document.getElementById(selectId);
                    if (selectEl && selectEl.value !== 'Aucun' && !selectEl.disabled) {
                        const accPrice = parseInt(selectEl.options[selectEl.selectedIndex].getAttribute('data-price')) || 0;
                        configText += ` | + ${selectEl.value} [+${accPrice}€]`;
                    }
                };
                addMtbAccessoryToConfig('config-pneus');
                addMtbAccessoryToConfig('config-bidons');
                addMtbAccessoryToConfig('config-tpu');
                addMtbAccessoryToConfig('config-kit-tpu');
                addMtbAccessoryToConfig('config-plaquettes');
                addMtbAccessoryToConfig('config-housses');
                addMtbAccessoryToConfig('config-lockrings');

            } else if (titleLC.includes('bâton') || titleLC.includes('tri-spoke') || titleLC.includes('lenticulaire') || titleLC.includes('disc')) {
            if (currentLenticulaireMode === 'location') {
                const dateEl = document.getElementById('config-date-location');
                const slotSelectLoc = document.getElementById('config-creneau-location');
                const slotTypeLoc = slotSelectLoc ? slotSelectLoc.value : 'VenDim';
                const dateLoc = dateEl && dateEl.value ? getSlotAnchor(dateEl.value, slotTypeLoc) : "Date non précisée";
                const slotLabelLoc = SLOT_DEFS[slotTypeLoc] ? SLOT_DEFS[slotTypeLoc].label : "Vendredi → Dimanche";
                const rl = document.getElementById('config-rouelibre-special').value;
                const selectMontage = document.getElementById('config-montage-location');
                const montageText = selectMontage ? selectMontage.value : "Sans Montage";
                const montagePrice = selectMontage && selectMontage.selectedIndex >= 0 ? (parseInt(selectMontage.options[selectMontage.selectedIndex].getAttribute('data-price')) || 0) : 0;

                const tarifBase = getLentiTarifDynamique(dateEl ? dateEl.value : "", slotTypeLoc);

                finalTitle = `${title} (Location ${slotLabelLoc})`;
                configText = `Créneau du : ${dateLoc} (${slotLabelLoc}) | Freins à Disques | Roue libre : ${rl} | Tarif : ${tarifBase}€ | Option : ${montageText}`;
                finalPrice = tarifBase + montagePrice; // Tarif dégressif selon proximité de la date + option de montage
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

                const montageRoueEl = document.getElementById('config-montage-roue');
                const montageRoueVal = montageRoueEl ? montageRoueEl.value : "Sans Montage";
                const montageRoueText = ` | Montage : ${montageRoueVal}`;

                let largeurPatinsText = "";
                if (freinage.includes("Patins")) {
                    const lPatinsSelect = document.getElementById('config-largeur-patins');
                    if (lPatinsSelect) largeurPatinsText = ` | Larg. ${lPatinsSelect.value.split(' -')[0]}`;
                }

                const colorEl = document.getElementById('config-couleur-moyeu');
                const couleurMoyeu = (colorEl && colorEl.value) ? " (" + colorEl.value + ")" : "";

                configText = `${moyeu}${couleurMoyeu} | Jantes ${jante} | ${rayon} | Ratchet ${ratchet} | Roulements ${roulements} | ${rouelibre} | ${finition} | Logos : ${logos} | ${freinage}${largeurPatinsText}${disquesText}${montageRoueText}`;
                
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
				addAccessoryToConfigText('config-kit-tpu');
				addAccessoryToConfigText('config-plaquettes');
				addAccessoryToConfigText('config-housses');
				addAccessoryToConfigText('config-lockrings');
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
            isAccessory: isCurrentItemAccessory,
			isTextile: isCurrentItemTextile
        };

        cart.push(item);
		// Auto-sélectionner l'acompte si on ajoute une tenue
        if (isCurrentItemTextile) {
            const acompteRadio = document.querySelector('input[value="acompte_textile"]');
            if (acompteRadio) acompteRadio.checked = true;
        }
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
            const isManivelle = titleLC.includes('manivelle');
            const isPetitAccessoire = titleLC.includes('pneu') || titleLC.includes('gp5000') || titleLC.includes('tpu') || titleLC.includes('chambre') || titleLC.includes('galfer') || titleLC.includes('disque') || titleLC.includes('plaquette') || titleLC.includes('bidon') || titleLC.includes('ahyka') || titleLC.includes('housse') || titleLC.includes('lockring') || titleLC.includes('kit');

            if (item.isTextile) {
                discountAmount += 10;
            } else if (isSpecialWheel || isManivelle) {
                discountAmount += 25;
            } else if (!item.isAccessory && !isSpecialWheel && !isManivelle) {
                discountAmount += 50;
            } else if (item.isAccessory && isPetitAccessoire) {
                discountAmount += Math.round(item.price * 0.08);
            }
        } else if (appliedPromo === 'PAPA26') {
            const titleLC = item.title.toLowerCase();
            const isManivelle = titleLC.includes('manivelle');
            const isPetitAccessoire = titleLC.includes('pneu') || titleLC.includes('gp5000') || titleLC.includes('tpu') || titleLC.includes('chambre') || titleLC.includes('galfer') || titleLC.includes('disque') || titleLC.includes('plaquette') || titleLC.includes('bidon') || titleLC.includes('ahyka') || titleLC.includes('housse') || titleLC.includes('lockring') || titleLC.includes('kit');

            // -100€ UNIQUEMENT si c'est un produit principal (roues) ET que le prix est de 1399€ ou plus (paire de roues)
            if (!item.isAccessory && !isManivelle && !item.isTextile && item.price >= 1399) {
                discountAmount += 100; 
            } else if (item.isAccessory && isPetitAccessoire) {
                discountAmount += Math.round(item.price * 0.10); // -10% sur les petits accessoires
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
                    <img src="${escapeHtml(item.image)}" class="w-full h-full object-contain">
                </div>
                <div class="flex-grow">
                    <h5 class="font-bold text-gray-900 text-sm leading-tight mb-1">${escapeHtml(item.title)}</h5>
                    <p class="text-[10px] text-gray-500 mb-2 font-medium bg-gray-50 p-1 rounded inline-block">${escapeHtml(item.config)}</p>
                    <div class="flex justify-between items-center">
                        ${weightDisplay}
                        <span class="font-black text-brand-accent ml-auto">${item.price} €</span>
                    </div>
                </div>
            `;
            container.appendChild(div);
        }
    });

	// Vérification post-boucle pour la promo PAPA26 (Paliers globaux)
    if (appliedPromo === 'PAPA26') {
        // On vérifie si le client a une PAIRE de roues (prix >= 1399) qui a déjà bénéficié des 100€
        const hasPaireDeRoues = cart.some(item => !item.isAccessory && !item.title.toLowerCase().includes('manivelle') && !item.isTextile && item.price >= 1399);
        
        // Si le client n'a PAS de paire de roues à 1399€, on applique les réductions sur le total du panier
        if (!hasPaireDeRoues) {
            if (subtotal >= 1000) {
                discountAmount += 75;  // -75€ pour un panier de plus de 1000€ (ex: roue lenti seule + accessoires)
            } else if (subtotal >= 500) {
                discountAmount += 50;  // -50€ pour un panier entre 500€ et 999.99€ (ex: roue lenti seule de 700€)
            }
        }
    }
	
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

    const hasTextile = cart.some(item => item.isTextile || (item.config && item.config.includes('Coupe :')));
    const finalTotal = currentSubtotal + transactionFees; 
    if (finalTotalEl) finalTotalEl.textContent = finalTotal % 1 === 0 ? finalTotal : finalTotal.toFixed(2); // <-- MISE À JOUR DE L'AFFICHAGE !
    const isEligibleFor3X = finalTotal >= 899; // Le nouveau seuil d'éligibilité

    const radioCB = document.querySelector('input[value="card1x"]')?.parentElement;
    const radio3x = document.querySelector('input[value="3x_pei"]')?.parentElement;
    const radio5050 = document.getElementById('option-pay-5050');
    
    const acompteMsg = document.getElementById('textile-acompte-msg');
    const acompteTotal = document.getElementById('cart-acompte-total');

    // 1. GESTION DU 3X (Réunion) et 50/50 (Métropole) selon le seuil de 899€
    if (currentDeliveryZone === 'reunion') {
        if (isEligibleFor3X) {
            if (radio3x) radio3x.classList.remove('hidden');
        } else {
            if (radio3x) radio3x.classList.add('hidden');
        }
        if (radio5050) { radio5050.classList.add('hidden'); radio5050.classList.remove('flex'); }
    } else { 
        if (isEligibleFor3X) {
            if (radio5050) { radio5050.classList.remove('hidden'); radio5050.classList.add('flex'); }
        } else {
            if (radio5050) { radio5050.classList.add('hidden'); radio5050.classList.remove('flex'); }
        }
        if (radio3x) radio3x.classList.add('hidden');
    }

    // 2. GESTION DU TEXTILE & ACOMPTE
    if (hasTextile) {
        // On affiche toujours l'alerte d'acompte (qui indique 50% du total)
        if (acompteMsg && acompteTotal) {
            acompteMsg.classList.remove('hidden');
            acompteMsg.classList.add('inline-block');
            acompteTotal.textContent = (finalTotal / 2).toFixed(2).replace('.00', '');
        }

        // On laisse toujours l'option Carte Bancaire visible, même pour les petits paniers
        if (radioCB) {
            radioCB.classList.remove('hidden');
        }
    } else {
        // Pas de textile : on cache le message d'acompte et on garantit que la CB est visible
        if (acompteMsg) {
            acompteMsg.classList.add('hidden');
            acompteMsg.classList.remove('inline-block');
        }
        if (radioCB) radioCB.classList.remove('hidden');
    }

    // 3. SÉCURITÉ : Réinitialiser la méthode de paiement si l'option choisie vient d'être cachée
    const currentChecked = document.querySelector('input[name="payment-method"]:checked');
    if (currentChecked) {
        let needsReset = false;
        if (currentChecked.value === '3x_pei' && (!isEligibleFor3X || currentDeliveryZone !== 'reunion')) needsReset = true;
        if (currentChecked.value === '5050_metropole' && (!isEligibleFor3X || currentDeliveryZone !== 'metropole')) needsReset = true;

        if (needsReset) {
            const virementRadio = document.querySelector('input[value="virement"]');
            if (virementRadio) virementRadio.checked = true;
        }
    }

    // 4. TEXTE DU BOUTON FINAL (Mise à jour spécifique si acompte textile sur petit panier)
    const finalChecked = document.querySelector('input[name="payment-method"]:checked');
    if (checkoutBtn && finalChecked && hasTextile && !isEligibleFor3X) {
        if (finalChecked.value === 'virement') {
            checkoutBtn.innerHTML = 'Valider & Payer 50% par Virement <i class="fa-solid fa-paper-plane ml-2 text-xl"></i>';
        } else if (finalChecked.value === 'especes') {
            checkoutBtn.innerHTML = 'Valider & Payer 50% en Espèces <i class="fa-solid fa-hand-holding-dollar ml-2 text-xl"></i>';
        }
    }
}

function applyPromoCode() {
    const input = document.getElementById('promo-code');
    if(!input) return;
    const code = input.value.trim().toUpperCase();
    if (code === 'CCPIKARBON' || code === 'PAPA26') {
        appliedPromo = code;
        input.value = '';
        updateCartUI();
    } else {
        showCustomAlert("Code promo invalide ou expiré.");
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
	const hasTextile = cart.some(item => item.isTextile || (item.config && item.config.includes('Coupe :')));
    if (hasTextile) {
        paymentMethodName += " (Précommande : Acompte 50%)";
    }
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
        produits: produitsPourFichier.join(" || "),
        factureNoms: factureNoms.join("\n\n"), 
        facturePrix: facturePrix.join("\n\n"), 
        total: finalTotal % 1 === 0 ? finalTotal : finalTotal.toFixed(2),
        promo: appliedPromo || "Aucun",
        statutPaiement: "En attente via " + paymentMethodName,
        statutLivraison: "En attente"
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
            if (hasTextile) {
                successPayText.textContent = "le récapitulatif pour effectuer ton acompte de 50% et valider la production de ta tenue à l'usine";
            } else if(paymentMethodVal === 'virement') {
                successPayText.textContent = "le RIB pour finaliser la réservation";
            } else if(paymentMethodVal === 'especes') {
                successPayText.textContent = "un message pour se voir afin de procéder au paiement en espèces";
            } else if(paymentMethodVal === 'card1x') {
                successPayText.textContent = "le lien Stripe sécurisé pour le paiement par carte";
            } else if(paymentMethodVal === '3x_pei') {
                successPayText.textContent = "le récapitulatif pour effectuer ton premier versement (50%) et lancer la production à l'usine";
            } else if(paymentMethodVal === '5050_metropole') {
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

async function loadFactoryStock() {
    try {
        const response = await fetch(`${API_URL}?action=getFactoryStock`);
        factoryStock = await response.json();
        renderFastTrackCards(); // Génère les cartes d'accueil
    } catch (error) {
        console.error("Erreur de chargement du stock usine :", error);
    }
}

function renderFastTrackCards() {
    const container = document.getElementById('fast-track-cards-container');
    const section = document.getElementById('stock-usine-coupe-file');
    if (!container) return;

    container.innerHTML = '';
    const inStockItems = factoryStock.filter(item => parseInt(item.Stock) > 0);

    if (inStockItems.length === 0) {
        if (section) section.style.display = 'none';
        return;
    }

    if (section) section.style.display = 'block';

    inStockItems.forEach(item => {
        const isLastPair = parseInt(item.Stock) === 1;
        const badgeClass = isLastPair ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-green-100 text-green-700 border-green-200';
        const badgeText = isLastPair ? '🚨 Dernière paire !' : `✅ ${parseInt(item.Stock) || 0} Paires dispo`;

        const isPulse = item.Series === 'PULSE';
        const displayName = `GHOST ${escapeHtml(item["Rim height"])}mm`;
        const hubName = isPulse ? 'Moyeu R2' : 'Moyeu RT240';
        
        let logoName = 'Noir Furtif';
        if (item["Logo Color"] === 'Big White') logoName = 'Gros Blanc';
        else if (item["Logo Color"] === 'White') logoName = 'Petit Blanc';
        
        const finishName = item.Finish === 'Glossy' ? 'Glossy Black' : 'UD Matte';

        const cardHTML = `
            <div class="bg-gray-50 rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col hover:shadow-md transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
                <div class="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-green-200 to-transparent opacity-50 rounded-bl-full z-0"></div>
                <span class="text-[10px] font-black px-2 py-1 rounded border ${badgeClass} w-max mb-3 relative z-10">${badgeText}</span>
                <h4 class="font-black text-gray-900 text-lg mb-1 relative z-10">${displayName}</h4>
                <p class="text-xs font-bold text-brand-accent mb-3 relative z-10">${hubName}</p>
                <ul class="text-xs text-gray-500 space-y-1.5 mb-5 flex-grow relative z-10">
                    <li><i class="fa-solid fa-check text-green-500 mr-1"></i> Jante : ${escapeHtml(item["Rim Type"])}</li>
                    <li><i class="fa-solid fa-check text-green-500 mr-1"></i> Finition : ${finishName}</li>
                    <li><i class="fa-solid fa-check text-green-500 mr-1"></i> Logos : ${logoName}</li>
                </ul>
                <button onclick="openFastTrackConfig('${escapeHtml(item.Series)}', '${escapeHtml(item["Rim height"])}', '${escapeHtml(item["Rim Type"])}', '${escapeHtml(item.Finish)}', '${escapeHtml(item["Logo Color"])}')" class="w-full bg-brand-main text-white text-xs font-bold py-2.5 rounded-lg hover:bg-gray-800 transition-colors relative z-10 shadow-sm">
                    Configurer cette paire <i class="fa-solid fa-arrow-right ml-1"></i>
                </button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHTML);
    });
}

function openFastTrackConfig(series, height, type, finish, logo) {
    // 1. Trouver l'index de la Ghost correspondante dans le catalogue (On s'assure de ne pas ouvrir le test/essai)
    const ghostIndex = globalCatalogue.findIndex(p => {
        if (!p.Nom) return false;
        const n = p.Nom.toLowerCase();
        // On exclut explicitement les modèles d'essai
        if (n.includes('test') || n.includes('essai')) return false;
        return n.includes(`ghost ${height}`);
    });

    if (ghostIndex === -1) {
        showCustomAlert("Ce profil n'est plus au catalogue.");
        return;
    }

    // 2. Ouvrir le modal
    openModal(ghostIndex);

    // 3. Appliquer les options usine via un timeout pour laisser le DOM se construire
    setTimeout(() => {
        const mHub = document.getElementById('config-moyeu');
        if (mHub) mHub.value = series === 'PULSE' ? 'R2' : 'RT240';
        updateHubOptions(); // Met à jour les sous-menus du moyeu lié (céramique, ratchet...)

        const mJante = document.getElementById('config-jante');
        if (mJante) mJante.value = type;

        const mFinition = document.getElementById('config-finition');
        if (mFinition) mFinition.value = finish === 'Glossy' ? 'Glossy Black' : 'UD Matte';

        const mLogos = document.getElementById('config-logos');
        if (mLogos) {
            if (logo === 'Black') mLogos.value = 'Petit logo noir';
            else if (logo === 'Big White') mLogos.value = 'Gros logo blanc';
            else if (logo === 'White') mLogos.value = 'Petit logo blanc';
        }

        // 4. Mettre à jour l'UI (qui fera apparaître la bannière verte de stock !)
        updateConfig();
        
        // 5. Scroller en douceur jusqu'au configurateur pour montrer au client
        const configSection = document.getElementById('configurator-section');
        if (configSection) {
            configSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 150);
}

async function loadCatalogue() {
    try {
        loadFactoryStock(); // NOUVEAU : Charge le stock usine (Fast-Track) en arrière-plan
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
        const isTestProgram = nomLC.includes('essai') || nomLC.includes('test');

        let imageUrl = item.Image ? item.Image.split(',')[0].trim() : 'https://images.unsplash.com/photo-1511994298241-608e28f14fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
        let prixAffiche = 'Sur devis';
        if (item.Prix) {
            prixAffiche = (isAccessory || isFixedPriceWheel || isTestProgram) ? `${item.Prix} €` : `Dès ${item.Prix} €`;
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
                statutBadge += `<span class="absolute top-4 left-4 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded shadow-md z-10"><i class="fa-solid fa-plane mr-1"></i> ${escapeHtml(item.Statut)}</span>`;
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
            let weightPrefix = (isFixedPriceWheel || isTestProgram) ? '' : 'Dès ';
            specLigne = `
                <span class="flex items-center"><i class="fa-solid fa-arrows-up-down text-brand-accent mr-1.5"></i> ${item.Hauteur || '-'}</span>
                ${item.Poids ? `<span class="text-gray-300">|</span><span class="flex items-center"><i class="fa-solid fa-weight-scale text-brand-accent mr-1.5"></i> ${weightPrefix}${item.Poids} g</span>` : ''}
            `;
        }

        let labelPrix = 'Prix (la paire)';
        if (nomLC.includes('lockring')) {
            labelPrix = 'Prix (la paire)';
        } else if (isTestProgram) {
            labelPrix = 'Prix';
        } else if (cat.toLowerCase().includes('textile') || nomLC.includes('tenue') || nomLC.includes('combinaison') || isAccessory || isFixedPriceWheel) {
            labelPrix = 'Prix unitaire';
        }

        const cardHtml = `
            <div onclick="openModal(${index})" class="wheel-card bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 flex flex-col relative group cursor-pointer">
                ${statutBadge}
                <div class="overflow-hidden h-64 bg-gray-50 flex items-center justify-center p-4 relative">
                    <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.Nom)}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span class="bg-brand-main text-white text-sm font-bold px-5 py-2 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition"><i class="fa-solid fa-eye mr-2"></i>Voir le produit</span>
                    </div>
                </div>
                <div class="p-6 flex flex-col flex-grow text-center">
                    <h4 class="text-xl font-black text-gray-900 mb-2">${escapeHtml(item.Nom)}</h4>
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

    // Bascule automatiquement sur SUXL et T32 si on choisit un moyeu ultra-léger
    const configJante = document.getElementById('config-jante');
    const configRayons = document.getElementById('config-rayons');
    if (isHubChange && (currentHub === 'RT240' || currentHub === 'RT220')) {
        if (configJante) configJante.value = 'SUXL';
        if (configRayons) configRayons.value = 'T32';
    }

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
            <option value="Argent" data-price="0">Argent (Standard)</option>
            <option value="Noir" data-price="0">Noir</option>
        `;
        ratchetSelect.innerHTML = `
            <option value="54T" data-price="0">54T (Inclus)</option>
        `;
        roulementsSelect.innerHTML = `
            <option value="Céramique SS" data-price="0">Céramique SS (Inclus)</option>
            <option value="Céramique TPI" data-price="79">Céramique TPI (Ultra-fluide) [+79€]</option>
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
    
    if (statutLC.includes('stock') || statutLC.includes('disponible')) {
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
		isCurrentItemTextile = (item.Categorie && String(item.Categorie).toLowerCase().includes('textile')) || nomLC.includes('tenue') || nomLC.includes('combinaison');
        isCurrentItemStockReady = nomLC.includes('prêt-à-rouler') || nomLC.includes('pret-a-rouler') || nomLC.includes('prêt à rouler') || nomLC.includes('pret a rouler');
        const isMtbWheel = nomLC.includes('apex') || nomLC.includes('vtt') || nomLC.includes('mtb');
        isCurrentItemWheelConfigurable = !isCurrentItemAccessory && !isCurrentItemTestProgram && !nomLC.includes('bâton') && !nomLC.includes('tri-spoke') && !nomLC.includes('lenticulaire') && !nomLC.includes('disc') && !nomLC.includes('manivelle') && !isMtbWheel;

        const isSpecialWheel = nomLC.includes('bâton') || nomLC.includes('tri-spoke') || nomLC.includes('lenticulaire') || nomLC.includes('disc');
        
        const priceLabel = document.getElementById('modal-price-label');
        if(priceLabel) {
            if (nomLC.includes('lockring')) {
                priceLabel.textContent = 'Prix (la paire)';
            } else {
                priceLabel.textContent = (isCurrentItemAccessory || isSpecialWheel || isCurrentItemTextile) ? 'Prix unitaire' : 'Prix (la paire)';
            }
        }

        const titleEl = document.getElementById('modal-title');
        if(titleEl) titleEl.textContent = item.Nom || "Produit";
        
        const descEl = document.getElementById('modal-desc');
        if(descEl) descEl.innerHTML = item.Description || "Sélectionnez vos options pour ajouter ce produit au panier.";
        
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
		const textileConfigContainer = document.getElementById('textile-config-container');
		if (textileConfigContainer) textileConfigContainer.style.display = 'none';
		// FORCER LE MASQUAGE DES MENUS SPÉCIAUX POUR TOUS LES AUTRES PRODUITS
		const blocRatchetSpecial = document.getElementById('bloc-ratchet-special');
		if (blocRatchetSpecial) blocRatchetSpecial.style.display = 'none';
		const blocLargeurSpecial = document.getElementById('bloc-largeur-special');
		if (blocLargeurSpecial) blocLargeurSpecial.style.display = 'none';
		const blocStickerLenti = document.getElementById('bloc-sticker-lenticulaire');
		if (blocStickerLenti) blocStickerLenti.style.display = 'none';
		
		// MASQUAGE DE LA BANNIÈRE STOCK PAR DÉFAUT À CHAQUE OUVERTURE
		const mainBannerStock = document.getElementById('stock-locked-banner');
		if (mainBannerStock) mainBannerStock.classList.add('hidden');
		const bannerFastTrack = document.getElementById('fast-track-banner');
		if (bannerFastTrack) bannerFastTrack.classList.add('hidden');
		const badgeFastTrack = document.getElementById('modal-fasttrack');
		if (badgeFastTrack) badgeFastTrack.classList.add('hidden');
		
		if (isCurrentItemTestProgram) {
            if(specJantesBox) specJantesBox.style.display = 'none';
            if(configuratorSection) configuratorSection.style.display = 'block';
            if(wheelConfigOptions) wheelConfigOptions.style.display = 'none';
            if(manivellesConfigContainer) manivellesConfigContainer.style.display = 'none';
            if(accessoryConfigContainer) accessoryConfigContainer.style.display = 'none';
            if(specialWheelConfigContainer) specialWheelConfigContainer.style.display = 'none';
            if(testConfigContainer) testConfigContainer.style.display = 'block';
            if(poidsMaxContainer) poidsMaxContainer.style.display = 'none';
            
            const selectMontageTest = document.getElementById('config-montage-test');
            if(selectMontageTest) selectMontageTest.value = "Sans Montage";
            const selectModeleTest = document.getElementById('config-modele-test');
            if(selectModeleTest) selectModeleTest.selectedIndex = 0;
            const selectCorpsTest = document.getElementById('config-corps-test');
            if(selectCorpsTest) selectCorpsTest.value = "Shimano HG";

            const cPrice = document.getElementById('calc-price');
            if(cPrice) cPrice.textContent = 50;
            const cWeight = document.getElementById('calc-weight');
            if(cWeight) cWeight.textContent = currentBaseWeight > 0 ? currentBaseWeight : '978';
            updateBadgeUI(false, "Disponible à l'essai");

            const dateInputTest = document.getElementById('config-date-test');
            if(dateInputTest) {
				dateInputTest.value = "";
                dateInputTest.min = new Date().toISOString().split('T')[0];
            }
            fetchUnavailableTestDates();
        } else if (isCurrentItemTextile) {
            if(specJantesBox) specJantesBox.style.display = 'none';
            if(configuratorSection) configuratorSection.style.display = 'block';
            if(wheelConfigOptions) wheelConfigOptions.style.display = 'none';
            if(manivellesConfigContainer) manivellesConfigContainer.style.display = 'none';
            if(accessoryConfigContainer) accessoryConfigContainer.style.display = 'none';
            if(specialWheelConfigContainer) specialWheelConfigContainer.style.display = 'none';
            if(testConfigContainer) testConfigContainer.style.display = 'none';
            if(textileConfigContainer) textileConfigContainer.style.display = 'block';
            if(poidsMaxContainer) poidsMaxContainer.style.display = 'none';

			const cPrice = document.getElementById('calc-price');
            if(cPrice) cPrice.innerHTML = '<span class="text-xl text-gray-400 line-through mr-2 font-medium">169€</span>159';
            const cWeight = document.getElementById('calc-weight');
            if(cWeight) cWeight.textContent = '--';
            updateBadgeUI(false, "Précommande");
            updateConfig();    
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
        } else if (nomLC.includes('plateaux pass quest') || nomLC.includes('pack étoile') || nomLC.includes('pack pro')) {
            if(specJantesBox) specJantesBox.style.display = 'none';
            if(configuratorSection) configuratorSection.style.display = 'block';
            if(wheelConfigOptions) wheelConfigOptions.style.display = 'none';
            if(manivellesConfigContainer) manivellesConfigContainer.style.display = 'none';
            if(accessoryConfigContainer) accessoryConfigContainer.style.display = 'block';
            if(specialWheelConfigContainer) specialWheelConfigContainer.style.display = 'none';
            if(testConfigContainer) testConfigContainer.style.display = 'none';
            if(poidsMaxContainer) poidsMaxContainer.style.display = 'none';
            
            const plateauxSeulsCont = document.getElementById('config-plateaux-seuls-container');
            if(plateauxSeulsCont) { plateauxSeulsCont.style.display = 'block'; plateauxSeulsCont.classList.remove('hidden'); }
            const tailleContainer = document.getElementById('config-taille-pneu-container');
            if(tailleContainer) { tailleContainer.style.display = 'none'; tailleContainer.classList.add('hidden'); }
            const galferContainer = document.getElementById('galfer-config-container');
            if(galferContainer) galferContainer.style.display = 'none';
            const minipompeContainer = document.getElementById('minipompe-config-container');
            if(minipompeContainer) minipompeContainer.style.display = 'none';

            const qteEl = document.getElementById('config-quantite');
            if(qteEl) qteEl.value = '1';

            updateConfig();
		} else if (isCurrentItemAccessory) {
            if(specJantesBox) specJantesBox.style.display = 'none';
            if(configuratorSection) configuratorSection.style.display = 'block';
            if(wheelConfigOptions) wheelConfigOptions.style.display = 'none';
            if(manivellesConfigContainer) manivellesConfigContainer.style.display = 'none';
			if(specialWheelConfigContainer) specialWheelConfigContainer.style.display = 'none';
            if(testConfigContainer) testConfigContainer.style.display = 'none';
            if(poidsMaxContainer) poidsMaxContainer.style.display = 'none';
            const plateauxSeulsCont = document.getElementById('config-plateaux-seuls-container');
            if(plateauxSeulsCont) plateauxSeulsCont.style.display = 'none';
            
            if(accessoryConfigContainer) accessoryConfigContainer.style.display = 'block';
            
            const tailleContainer = document.getElementById('config-taille-pneu-container');
            const tailleSelect = document.getElementById('config-taille-pneu');
            const galferContainer = document.getElementById('galfer-config-container');
            const minipompeContainer = document.getElementById('minipompe-config-container');

            // Changement dynamique du label Taille -> Couleur
            if (tailleContainer) {
                const labelTaille = tailleContainer.querySelector('label');
                if (labelTaille) {
                    if (nomLC.includes('lockring')) {
                        labelTaille.innerHTML = '<i class="fa-solid fa-palette text-brand-accent mr-1"></i> Couleur';
                    } else {
                        labelTaille.innerHTML = '<i class="fa-solid fa-ruler text-brand-accent mr-1"></i> Taille';
                    }
                }
            }

            if (nomLC.includes('disque')) {
                if(tailleContainer) tailleContainer.style.display = 'none';
                if(galferContainer) galferContainer.style.display = 'block';
                if(minipompeContainer) minipompeContainer.style.display = 'none';
            } else if (nomLC.includes('pompe')) {
                if(tailleContainer) tailleContainer.style.display = 'none';
                if(galferContainer) galferContainer.style.display = 'none';
                if(minipompeContainer) minipompeContainer.style.display = 'block';
            } else if(tailleContainer && tailleSelect) {
                if(galferContainer) galferContainer.style.display = 'none';
                if(minipompeContainer) minipompeContainer.style.display = 'none';

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
            const mtbConfigContainer = document.getElementById('mtb-config-container');
            if (mtbConfigContainer) mtbConfigContainer.style.display = 'none';
            
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
            const mJante = document.getElementById('config-jante');
            const mRayons = document.getElementById('config-rayons');
            const mFinition = document.getElementById('config-finition');
            const mLogos = document.getElementById('config-logos');
            const mRouelibre = document.getElementById('config-rouelibre');
            const mFreinage = document.getElementById('config-freinage');

            // Réinitialiser les menus d'accessoires
            const mPneus = document.getElementById('config-pneus');
            if(mPneus) mPneus.value = 'Aucun';
            const mBidons = document.getElementById('config-bidons');
            if(mBidons) mBidons.value = 'Aucun';
            const mTpu = document.getElementById('config-tpu');
            if(mTpu) mTpu.value = 'Aucun';
			const mKitTpu = document.getElementById('config-kit-tpu');
            if(mKitTpu) mKitTpu.value = 'Aucun';
			const mHousses = document.getElementById('config-housses');
            if(mHousses) mHousses.value = 'Aucun';
			const mLockrings = document.getElementById('config-lockrings');
            if(mLockrings) mLockrings.value = 'Aucun';

            const bannerStock = document.getElementById('stock-locked-banner');

            // VERROUILLAGE SI C'EST LE PACK "PRÊT-À-ROULER"
            if (isCurrentItemStockReady) {
                if(bannerStock) bannerStock.classList.remove('hidden');

                if(mHub) { mHub.value = 'R2'; mHub.disabled = true; lastHubSelected = 'R2'; }
                if(mJante) { mJante.value = 'SUXL'; mJante.disabled = true; } // Par défaut sur SUXL, à modifier par UXL si besoin
                if(mRayons) { mRayons.value = 'T33'; mRayons.disabled = true; }
                if(mFinition) { mFinition.value = 'Glossy Black'; mFinition.disabled = true; }
                if(mLogos) { mLogos.value = 'Petit logo noir'; mLogos.disabled = true; }
                if(mFreinage) { mFreinage.value = 'Disques'; mFreinage.disabled = true; }
                if(mRouelibre) { mRouelibre.value = 'Shimano HG'; mRouelibre.disabled = false; } // Laissé déverrouillé au cas où tu aurais un corps SRAM

                updateHubOptions(); 

                const cColor = document.getElementById('config-couleur-moyeu');
                if(cColor) { cColor.value = 'Noir'; cColor.disabled = true; }
                const cRatchet = document.getElementById('config-ratchet');
                if(cRatchet) { cRatchet.value = '45T'; cRatchet.disabled = true; }
                const cRoulements = document.getElementById('config-roulements');
                if(cRoulements) { cRoulements.value = 'Acier EZO'; cRoulements.disabled = true; }

            } else {
                // DÉVERROUILLAGE SI C'EST UNE ROUE SUR MESURE NORMALE
                if(bannerStock) bannerStock.classList.add('hidden');

                if(mHub) { mHub.value = 'R2'; mHub.disabled = false; lastHubSelected = 'R2'; }
                if(mJante) { mJante.value = 'UXL'; mJante.disabled = false; }
                if(mRayons) { mRayons.value = 'T33'; mRayons.disabled = false; }
                if(mFinition) { mFinition.value = 'Glossy Black'; mFinition.disabled = false; }
                if(mLogos) { mLogos.value = 'Petit logo noir'; mLogos.disabled = false; }
                if(mFreinage) { mFreinage.value = 'Disques'; mFreinage.disabled = false; }
                if(mRouelibre) { mRouelibre.value = 'Shimano HG'; mRouelibre.disabled = false; }

                updateHubOptions(); 

                const cColor = document.getElementById('config-couleur-moyeu');
                if(cColor) { cColor.value = 'Noir'; cColor.disabled = false; }
                const cRatchet = document.getElementById('config-ratchet');
                if(cRatchet) { cRatchet.disabled = false; }
                const cRoulements = document.getElementById('config-roulements');
                if(cRoulements) { cRoulements.disabled = false; }
            }
            
            updateConfig();
        } else if (isMtbWheel) {
            if(specJantesBox) specJantesBox.style.display = 'block';
            if(configuratorSection) configuratorSection.style.display = 'block';
            if(wheelConfigOptions) wheelConfigOptions.style.display = 'none'; // On cache les options route
            if(manivellesConfigContainer) manivellesConfigContainer.style.display = 'none';
            if(accessoryConfigContainer) accessoryConfigContainer.style.display = 'none';
            if(specialWheelConfigContainer) specialWheelConfigContainer.style.display = 'none';
            if(testConfigContainer) testConfigContainer.style.display = 'none';
            if(poidsMaxContainer) poidsMaxContainer.style.display = 'block';
            
            const mtbConfigContainer = document.getElementById('mtb-config-container');
            if (mtbConfigContainer) mtbConfigContainer.style.display = 'block';

            // --- INJECTION DES LARGEURS DE JANTES VTT ---
            const mtbLargeurSelect = document.getElementById('config-mtb-largeur');
            if (mtbLargeurSelect) {
                mtbLargeurSelect.innerHTML = '';
                let options = [];
                if (nomLC.includes('20')) {
                    options = ['24mm Int / 30mm Ext (XC)', '27mm Int / 33mm Ext (XC)', '29mm Int / 36mm Ext (XC)', '30mm Int / 36mm Ext (XC-Trail)', '31mm Int / 39mm Ext (Trail-AM)'];
                } else if (nomLC.includes('23')) {
                    options = ['22mm Int / 27mm Ext (Pure XC)'];
                } else if (nomLC.includes('25')) {
                    options = ['27mm Int / 34mm Ext (Trail-AM)', '29mm Int / 35mm Ext (Trail-AM)'];
                } else if (nomLC.includes('27') || nomLC.includes('28')) {
                    options = ['31mm Int / 39mm Ext (Enduro)', '32mm Int / 40mm Ext (DH-Enduro)'];
                } else if (nomLC.includes('30')) {
                    options = ['24mm Int / 30mm Ext (Trail)', '27mm Int / 33mm Ext (Trail-AM)', '30mm Int / 36mm Ext (All-Mountain)'];
                } else {
                    options = ['30mm Int / 36mm Ext (Standard)'];
                }
                options.forEach(opt => {
                    const el = document.createElement('option');
                    el.value = opt;
                    el.textContent = opt;
                    mtbLargeurSelect.appendChild(el);
                });
            }

            const cPrice = document.getElementById('calc-price');
            if(cPrice) cPrice.textContent = currentBasePrice > 0 ? currentBasePrice : '--';
            const cWeight = document.getElementById('calc-weight');
            if(cWeight) cWeight.textContent = currentBaseWeight > 0 ? currentBaseWeight : '--';
            updateBadgeUI(true);
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
                        <option value="Série STD" data-price="0" data-weight-diff="0">Série STD (Moyeu 36T) - 1150g [+0€]</option>
                        <option value="Série XL" data-price="100" data-weight-diff="-120">Série XL (Moyeu 36T) - 1030g [+100€]</option>
                        <option value="Série UXL" data-price="200" data-weight-diff="-230">Série UXL (Moyeu 54T) - 920g [+200€]</option>
                        <option value="Série RUXL" data-price="300" data-weight-diff="-250">Série RUXL (Moyeu SSF) - 900g [+300€]</option>
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

        // --- VERROUILLAGE SÉCURITÉ : Forcer la vérification des champs date obligatoires ---
        if (isCurrentItemTestProgram) checkTestDateAvailability();
        if (isSpecialWheel && currentLenticulaireMode === 'location') checkDateAvailability();

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

    // 💡 Déclaration globale de getPrice pour que VTT, Accessoires et Route puissent l'utiliser !
    const getPrice = (el) => {
        if(!el || el.selectedIndex < 0) return 0;
        return parseInt(el.options[el.selectedIndex].getAttribute('data-price')) || 0;
    };

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

	if (isCurrentItemTextile) {
        const qteEl = document.getElementById('config-textile-quantite');
        const qte = qteEl ? parseInt(qteEl.value) : 1;
        
        const chaussettesSelect = document.getElementById('config-textile-chaussettes');
        const blocQuantiteSocks = document.getElementById('bloc-quantite-chaussettes');
        
        let chaussettesQte = 0;
        
        // Si le client dit "Oui" aux chaussettes
        if (chaussettesSelect && chaussettesSelect.selectedIndex > 0) {
            // On affiche le bloc de quantité
            if (blocQuantiteSocks) blocQuantiteSocks.classList.remove('hidden');
            const sockQteEl = document.getElementById('config-chaussettes-quantite');
            chaussettesQte = sockQteEl ? parseInt(sockQteEl.value) : 1;
        } else {
            // Sinon on cache le bloc
            if (blocQuantiteSocks) blocQuantiteSocks.classList.add('hidden');
        }

        // On sépare bien les multiplications pour ne pas surfacturer le client
        const finalPrice = (159 * qte) + (29 * chaussettesQte);
        const basePrice = (169 * qte) + (29 * chaussettesQte);
        
        const cPrice = document.getElementById('calc-price');
        if(cPrice) cPrice.innerHTML = `<span class="text-xl text-gray-400 line-through mr-2 font-medium">${basePrice}€</span>${finalPrice}`;
        if(cWeightSpan) cWeightSpan.textContent = '--';
        
        updateBadgeUI(false, "Précommande");
        return; 
    }

    // --- GESTION DES ROUES VTT (APEX) ---
    const isMTB = titleLC.includes('apex') || titleLC.includes('vtt') || titleLC.includes('mtb');
    const mtbContainer = document.getElementById('mtb-config-container');
    const roadContainer = document.getElementById('wheel-config-options');
    
    // Bascule stricte de l'affichage entre Route et VTT
    if (mtbContainer && roadContainer) {
        if (isMTB) {
            mtbContainer.classList.remove('hidden');
            roadContainer.classList.add('hidden');
        } else {
            mtbContainer.classList.add('hidden');
            roadContainer.classList.remove('hidden');
        }
    }

    if (isMTB) {
        const mtbMoyeuSelect = document.getElementById('config-mtb-moyeu');
        const mtbJanteSelect = document.getElementById('config-mtb-jante');
        const mtbCouleurSelect = document.getElementById('config-mtb-couleur'); // Pour le DMB2
        const mtbRatchetSelect = document.getElementById('config-mtb-ratchet'); // Pour le DMB2
        const mtbDmb2Options = document.getElementById('mtb-dmb2-options');
        
        // On cache la largeur/hauteur Route car les specs VTT sont différentes
        const specBox = document.getElementById('spec-jantes-box');
        if (specBox) specBox.style.display = 'none';
        
        let mtbFinalPrice = currentBasePrice;
        let mtbFinalWeight = currentBaseWeight;
        
        if (mtbMoyeuSelect && mtbJanteSelect) {
            const mtbHub = mtbMoyeuSelect.value;

            // GESTION UI DMB2 (Affichage couleurs/ratchet)
            if (mtbDmb2Options) {
                if (mtbHub === 'DMB2') {
                    mtbDmb2Options.classList.remove('hidden');
                } else {
                    mtbDmb2Options.classList.add('hidden');
                }
            }
            
            // GESTION DMT1 (Jante XL Incompatible avec rayons carbone)
            const optXL = Array.from(mtbJanteSelect.options).find(opt => opt.value === 'XL');
            if (mtbHub === 'DMT1') {
                if(optXL) { optXL.disabled = true; optXL.textContent = 'XL (Incompatible avec DMT1)'; }
                if (mtbJanteSelect.value === 'XL') mtbJanteSelect.value = 'UXL'; // Force UXL
            } else {
                if(optXL) { optXL.disabled = false; optXL.textContent = 'XL (Standard)'; }
            }

            const mtbRim = mtbJanteSelect.value;
            
            // Tarification dynamique basée sur le prix du sheet (currentBasePrice)
            let hubPrice = getPrice(mtbMoyeuSelect);
            let rimPrice = getPrice(mtbJanteSelect);
            
            mtbFinalPrice = currentBasePrice + hubPrice + rimPrice;

            // Poids selon Moyeu + Jante
            if (mtbHub === 'DMB1' || mtbHub === 'DMC1') {
                mtbFinalWeight = mtbRim === 'UXL' ? 1205 : 1360;
            } else if (mtbHub === 'DMB2') {
                mtbFinalWeight = mtbRim === 'UXL' ? 1225 : 1380;
            } else if (mtbHub === 'DMT1') {
                mtbFinalWeight = 1035; // Poids plume rayon carbone
            }
            
            // Gestion du Ratchet si DMB2
            if (mtbHub === 'DMB2' && mtbRatchetSelect && mtbRatchetSelect.value === '72T') {
                mtbFinalPrice += 49;
            }
        }

        // Ajout dynamique du prix des accessoires sélectionnés (Pneus, Disques, etc.) pour les VTT
        const accessSelects = document.querySelectorAll('#green-accessory-box select');
        accessSelects.forEach(select => {
            if (select.value !== 'Aucun' && select.selectedIndex >= 0 && !select.disabled) {
                const priceOpt = getPrice(select);
                mtbFinalPrice += priceOpt;
            }
        });
        
        const cPrice = document.getElementById('calc-price');
        if(cPrice) cPrice.textContent = mtbFinalPrice > 0 ? mtbFinalPrice : currentBasePrice; // Force le calcul !
        const cWeightSpan = document.getElementById('calc-weight');
        if(cWeightSpan) cWeightSpan.textContent = mtbFinalWeight > 0 ? mtbFinalWeight : currentBaseWeight;
        
        updateBadgeUI(true); // Gère les labels "En stock" etc
        return; // STOPE L'EXECUTION ICI POUR LES VTT - LE BUG ETAIT LA AVANT
    }

	// ==========================================
	// --- SUITE : LOGIQUE POUR LES ACCESSOIRES ET PLATEAUX SEULS ---
	// ==========================================
    if (isCurrentItemAccessory || titleLC.includes('plateaux pass quest') || titleLC.includes('pack étoile') || titleLC.includes('pack pro')) {
        const qteEl = document.getElementById('config-quantite');
        const qte = qteEl ? parseInt(qteEl.value) : 1;
        
        let unitPrice = currentBasePrice;
        if (titleLC.includes('plateaux pass quest') || titleLC.includes('pack étoile') || titleLC.includes('pack pro')) {
            const visserieEl = document.getElementById('config-visserie-plateaux-seuls');
            if (visserieEl && visserieEl.selectedIndex > 0) {
                unitPrice += parseInt(visserieEl.options[visserieEl.selectedIndex].getAttribute('data-price')) || 0;
            }
        }
        let finalPrice = unitPrice * qte;
        
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

        // --- GESTION DYNAMIQUE DE LA MINI POMPE RIDENOW ---
        if (titleLC.includes('pompe')) {
            const modeleSelect = document.getElementById('config-minipompe-modele');
            let unitPrice = currentBasePrice;
            if (modeleSelect && modeleSelect.selectedIndex >= 0) {
                unitPrice = currentBasePrice + (parseInt(modeleSelect.options[modeleSelect.selectedIndex].getAttribute('data-price')) || 0);
            }
            finalPrice = unitPrice * qte;
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

	// ==========================================
	// --- SUITE : LOGIQUE POUR LES ROUES SPÉCIALES ---
	// ==========================================
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
            const dateElLive = document.getElementById('config-date-location');
            const slotSelectLive = document.getElementById('config-creneau-location');
            const slotTypeLive = slotSelectLive ? slotSelectLive.value : 'VenDim';
            const tarifBaseLive = getLentiTarifDynamique(dateElLive ? dateElLive.value : "", slotTypeLive);

            finalPrice = tarifBaseLive + montagePrice; // Tarif dégressif selon proximité de la date + option de montage
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

	// ==========================================
	// --- SUITE : LOGIQUE POUR LES ROUES ROUTE ---
	// ==========================================
    if (isCurrentItemTestProgram) {
        const selectMontageTest = document.getElementById('config-montage-test');
        const montagePriceTest = selectMontageTest && selectMontageTest.selectedIndex >= 0 ? (parseInt(selectMontageTest.options[selectMontageTest.selectedIndex].getAttribute('data-price')) || 0) : 0;

        const selectModeleTest = document.getElementById('config-modele-test');
        const modeleWeightTest = selectModeleTest && selectModeleTest.selectedIndex >= 0 ? (parseInt(selectModeleTest.options[selectModeleTest.selectedIndex].getAttribute('data-weight')) || 978) : 978;

        let finalPrice = 50 + montagePriceTest;

        const cPrice = document.getElementById('calc-price');
        if(cPrice) cPrice.textContent = finalPrice > 0 ? finalPrice : '--';
        if(cWeightSpan) cWeightSpan.textContent = modeleWeightTest;

        return; // On stoppe le calcul ici
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
    const plaquettesSelect = document.getElementById('config-plaquettes');
    const plaquettesContainer = document.getElementById('config-plaquettes-container');
    const freinageSelect = document.getElementById('config-freinage');
    const largeurPatinsContainer = document.getElementById('config-largeur-patins-container');

    // Masquer les options disques/plaquettes et afficher la largeur si le client choisit des freins à patins
    if (freinageSelect) {
        if (freinageSelect.value === 'Patins') {
            if (disquesContainer) disquesContainer.classList.add('hidden');
            if (disquesSelect) disquesSelect.value = 'Aucun';
            if (plaquettesContainer) plaquettesContainer.classList.add('hidden');
            if (plaquettesSelect) plaquettesSelect.value = 'Aucun';
            if (largeurPatinsContainer) largeurPatinsContainer.classList.remove('hidden');
        } else {
            if (disquesContainer) disquesContainer.classList.remove('hidden');
            if (plaquettesContainer) plaquettesContainer.classList.remove('hidden');
            if (largeurPatinsContainer) largeurPatinsContainer.classList.add('hidden');
        }
    }
    const disquesPrice = disquesSelect && disquesSelect.selectedIndex >= 0 ? (parseInt(disquesSelect.options[disquesSelect.selectedIndex].getAttribute('data-price')) || 0) : 0;
    
    const pneusSelect = document.getElementById('config-pneus');
    const bidonsSelect = document.getElementById('config-bidons');
    const tpuSelect = document.getElementById('config-tpu');
	const houssesSelect = document.getElementById('config-housses');
    const lockringsSelect = document.getElementById('config-lockrings');
    const montageRoueSelect = document.getElementById('config-montage-roue');
    const kitTpuSelect = document.getElementById('config-kit-tpu');

    const optT52 = rayonSelect ? Array.from(rayonSelect.options).find(opt => opt.value === 'T52') : null;
    const optT52Interne = document.getElementById('opt-t52-interne');
    const optT32Interne = document.getElementById('opt-t32-interne');
    
    // 1. Calcul du texte dynamique pour les écrous internes selon le moyeu
    let baseTextT52Interne = 'T52 + Internes';
    let baseTextT32Interne = 'T32 + Internes';
    
    if (moyeuSelect) {
        if (moyeuSelect.value === 'R2') {
            if (optT52Interne) { optT52Interne.setAttribute('data-price', '159'); baseTextT52Interne = 'T52 + Internes [+159€]'; }
            if (optT32Interne) { optT32Interne.setAttribute('data-price', '228'); baseTextT32Interne = 'T32 + Internes [+228€ sur R2]'; }
        } else {
            if (optT52Interne) { optT52Interne.setAttribute('data-price', '99'); baseTextT52Interne = 'T52 + Internes [+99€]'; }
            if (optT32Interne) { optT32Interne.setAttribute('data-price', '99'); baseTextT32Interne = 'T32 + Internes [+99€]'; }
        }
    }

    // 2. Gestion de l'incompatibilité avec les Freins à Patins
    if (freinageSelect && freinageSelect.value === 'Patins') {
        if (optT52) {
            optT52.disabled = true;
            optT52.textContent = 'Carbone T52 (Incompatible avec Patins)';
        }
        if (optT52Interne) {
            optT52Interne.disabled = true;
            optT52Interne.textContent = 'Carbone T52 (Incompatible avec Patins)';
        }
        // Sécurité : Si le client avait déjà cliqué sur T52, on le remet sur T33 par défaut
        if (rayonSelect && (rayonSelect.value === 'T52' || rayonSelect.value === 'T52_interne')) {
            rayonSelect.value = 'T33';
        }
    } else {
        // On débloque si on repasse sur Disques
        if (optT52) {
            optT52.disabled = false;
            optT52.textContent = 'Carbone T52 (5.2g)';
        }
        if (optT52Interne) {
            optT52Interne.disabled = false;
            optT52Interne.textContent = baseTextT52Interne;
        }
    }
    
    const larIntEl = document.getElementById('modal-largeur-int');
    const larExtEl = document.getElementById('modal-largeur-ext');
    const alerteLargeurPatins = document.getElementById('alerte-largeur-patins');
    
    if (freinageSelect && larIntEl && larExtEl) {
        if (freinageSelect.value === 'Patins') {
            const largeurPatinsSelect = document.getElementById('config-largeur-patins');
            if (largeurPatinsSelect && largeurPatinsSelect.value.includes('25mm')) {
                larIntEl.textContent = '18 mm';
                larExtEl.textContent = '25 mm';
                if (alerteLargeurPatins) alerteLargeurPatins.classList.add('hidden');
            } else {
                larIntEl.textContent = '21 mm';
                larExtEl.textContent = '28 mm';
                if (alerteLargeurPatins) alerteLargeurPatins.classList.remove('hidden');
            }
        } else {
            larIntEl.textContent = '24 mm';
            larExtEl.textContent = '32 mm';
            if (alerteLargeurPatins) alerteLargeurPatins.classList.add('hidden');
        }
    }

    const cassettesSelect = document.getElementById('config-cassettes');
    
    const msgRecoR2 = document.getElementById('msg-reco-r2');
    const t32Option = document.getElementById('opt-t32');
    const patinsOption = freinageSelect ? Array.from(freinageSelect.options).find(opt => opt.value === 'Patins') : null;
    const suxlOption = janteSelect ? Array.from(janteSelect.options).find(opt => opt.value === 'SUXL') : null;
	const evoOption = document.getElementById('opt-evo');

    // === GESTION DES INCOMPATIBILITÉS PAR MOYEU ===
    if (moyeuSelect && moyeuSelect.value === 'R2') {
        if(msgRecoR2) msgRecoR2.style.display = 'flex';
        // Le T32 est permis, facturé 69€ de plus (via attribut data-price)
        if(t32Option) { 
            t32Option.disabled = false; 
            t32Option.textContent = 'Carbone T32 [+69€ sur R2]'; 
            t32Option.setAttribute('data-price', '69'); 
        }
        
		if(evoOption) { evoOption.disabled = true; evoOption.textContent = 'EVO (Incompatible avec R2)'; }
        if (janteSelect && janteSelect.value.includes('EVO')) janteSelect.value = 'SUXL';
        
        if (suxlOption) { suxlOption.disabled = true; suxlOption.textContent = 'SUXL (Incompatible avec moyeu R2)'; }
        if (janteSelect && janteSelect.value === 'SUXL') janteSelect.value = 'UXL';
        
        if (patinsOption) { patinsOption.disabled = false; patinsOption.textContent = 'Freins à Patins (Bande Haute Température)'; }
        
    } else if (moyeuSelect && moyeuSelect.value === 'RT220') {
        if(msgRecoR2) msgRecoR2.style.display = 'none';
        if(t32Option) { 
            t32Option.disabled = false; 
            t32Option.textContent = 'Carbone T32 (2.1g)'; 
            t32Option.setAttribute('data-price', '0'); 
        }
        
        // RT220 incompatible avec EVO
        if(evoOption) { evoOption.disabled = true; evoOption.textContent = 'EVO (Incompatible avec RT220)'; }
        if (janteSelect && janteSelect.value.includes('EVO')) janteSelect.value = 'SUXL';
        
        if (suxlOption) { suxlOption.disabled = false; suxlOption.textContent = 'SUXL (Super Ultra-Light)'; }
        if (patinsOption) { patinsOption.disabled = true; patinsOption.textContent = 'Freins à Patins (Incompatible avec RT220)'; }
        if (freinageSelect && freinageSelect.value === 'Patins') freinageSelect.value = 'Disques';
        
    } else {
        // RT240
        if(msgRecoR2) msgRecoR2.style.display = 'none';
        if(t32Option) { 
            t32Option.disabled = false; 
            t32Option.textContent = 'Carbone T32 (2.1g)'; 
            t32Option.setAttribute('data-price', '0'); 
        }
        
		if(evoOption) { evoOption.disabled = false; evoOption.textContent = 'EVO (Trous Moulés) [+100€]'; }
        if (suxlOption) { suxlOption.disabled = false; suxlOption.textContent = 'SUXL (Super Ultra-Light)'; }
        
        if (patinsOption) { patinsOption.disabled = true; patinsOption.textContent = 'Freins à Patins (Incompatible avec RT240)'; }
        if (freinageSelect && freinageSelect.value === 'Patins') freinageSelect.value = 'Disques';
    }

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
			if (houssesSelect) houssesSelect.value = 'Aucun';
            if (lockringsSelect) lockringsSelect.value = 'Aucun';
            if (kitTpuSelect) kitTpuSelect.value = 'Aucun';
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
	const jantePrice = getPrice(janteSelect);

    // --- AJOUT : ON RÉCUPÈRE LE PRIX DES PLAQUETTES ---
    const plaquettesPrice = plaquettesSelect && plaquettesSelect.selectedIndex >= 0 ? (parseInt(plaquettesSelect.options[plaquettesSelect.selectedIndex].getAttribute('data-price')) || 0) : 0;
	
    const houssesPrice = getPrice(houssesSelect);
    const lockringsPrice = getPrice(lockringsSelect);
    const kitTpuPrice = getPrice(kitTpuSelect);
    const pneusPrice = getPrice(pneusSelect);
    const bidonsPrice = getPrice(bidonsSelect);
    const tpuPrice = getPrice(tpuSelect);
    const montageRouePrice = getPrice(montageRoueSelect);
    const accessoiresPrice = pneusPrice + bidonsPrice + tpuPrice + houssesPrice + lockringsPrice + kitTpuPrice + montageRouePrice;
    
    const hubWeight = moyeuSelect && moyeuSelect.selectedIndex >= 0 ? (parseInt(moyeuSelect.options[moyeuSelect.selectedIndex].getAttribute('data-hub-weight')) || 238) : 238;
    const spokeCount = moyeuSelect && moyeuSelect.selectedIndex >= 0 ? (parseInt(moyeuSelect.options[moyeuSelect.selectedIndex].getAttribute('data-spokes')) || 40) : 40;
    const rimDiff = janteSelect && janteSelect.selectedIndex >= 0 ? (parseInt(janteSelect.options[janteSelect.selectedIndex].getAttribute('data-weight-diff')) || 0) : 0;
    const finitionWeight = finitionSelect && finitionSelect.selectedIndex >= 0 ? (parseInt(finitionSelect.options[finitionSelect.selectedIndex].getAttribute('data-weight')) || 0) : 0;
    const spokeWeight = rayonSelect && rayonSelect.selectedIndex >= 0 ? (parseFloat(rayonSelect.options[rayonSelect.selectedIndex].getAttribute('data-spoke-weight')) || 2.1) : 2.1;
    
    const freinageWeight = freinageSelect && freinageSelect.value === 'Patins' ? 130 : 0;

    const finalPrice = currentBasePrice + moyeuPrice + rayonPrice + jantePrice + finitionPrice + colorPrice + ratchetPrice + roulementsPrice + accessoiresPrice + disquesPrice + plaquettesPrice;
    
    const baseComboWeight = 322; 
    const newComboWeight = hubWeight + (spokeCount * spokeWeight) + rimDiff + finitionWeight + freinageWeight;
    const finalWeight = Math.round(currentBaseWeight - baseComboWeight + newComboWeight);

    const cPrice = document.getElementById('calc-price');
    if(cPrice) cPrice.textContent = finalPrice > 0 ? finalPrice : '--';
    if(cWeightSpan) cWeightSpan.textContent = finalWeight > 0 ? finalWeight : '--';
    
    const poidsMaxSpan = document.getElementById('modal-poids-max');
    if (poidsMaxSpan && moyeuSelect && janteSelect) {
        let maxWeight = '90 kg'; // Sécurité par défaut (RT220)
        if (moyeuSelect.value === 'R2') {
            maxWeight = '120 kg';
        } else if (moyeuSelect.value === 'RT240') {
            maxWeight = janteSelect.value.includes('EVO') ? '110 kg' : '100 kg';
        } else if (moyeuSelect.value === 'RT220') {
            maxWeight = '90 kg';
        }
        poidsMaxSpan.textContent = maxWeight;
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

    // ==========================================
    // NOUVEAU : LOGIQUE FAST-TRACK (STOCK USINE)
    // ==========================================
    const badgeFastTrack = document.getElementById('modal-fasttrack');
    const bannerFastTrack = document.getElementById('fast-track-banner');
    let isFastTrack = false;

    if (isCurrentItemWheelConfigurable && factoryStock.length > 0) {
        // Traduction intelligente : Si Ghost + Moyeu R2 = PULSE pour l'usine
        let seriesMatch = '';
        if (titleLC.includes('ghost')) {
            const currentHub = document.getElementById('config-moyeu') ? document.getElementById('config-moyeu').value : '';
            seriesMatch = (currentHub === 'R2') ? 'PULSE' : 'GHOST';
        }
        
        const heightMatch = titleLC.match(/\d{2}/) ? titleLC.match(/\d{2}/)[0] : '';
        const typeMatch = janteSelect ? janteSelect.value : '';
        
        let logoMatch = '';
        if (logoSelect) {
            if (logoSelect.value === 'Petit logo noir') logoMatch = 'Black';
            else if (logoSelect.value === 'Gros logo blanc') logoMatch = 'Big White';
            else if (logoSelect.value === 'Petit logo blanc') logoMatch = 'White';
        }

        let finishMatch = '';
        if (finitionSelect) {
            finishMatch = finitionSelect.value === 'Glossy Black' ? 'Glossy' : 'UD Matte';
        }

        // 2. On cherche une correspondance exacte dans le tableau avec du stock
        const inStock = factoryStock.find(row => 
            row.Series === seriesMatch && 
            String(row["Rim height"]) === heightMatch && 
            row["Rim Type"] === typeMatch && 
            row["Logo Color"] === logoMatch && 
            row.Finish === finishMatch &&
            parseInt(row.Stock) > 0
        );

        if (inStock) {
            isFastTrack = true;
        }
    }

    // 3. Affichage dynamique
    if (badgeFastTrack) {
        if (isFastTrack) { 
            badgeFastTrack.classList.remove('hidden'); 
            badgeFastTrack.classList.add('inline-flex', 'items-center'); 
        } else { 
            badgeFastTrack.classList.add('hidden'); 
            badgeFastTrack.classList.remove('inline-flex', 'items-center'); 
        }
    }
    
    if (bannerFastTrack) {
        if (isFastTrack) bannerFastTrack.classList.remove('hidden');
        else bannerFastTrack.classList.add('hidden');
    }
    // ==========================================

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
        dateInput.min = new Date().toISOString().split('T')[0];
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

    renderLocationCalendar();

    const dateInput = document.getElementById('config-date-location');
    const alertEpuise = document.getElementById('alert-location-epuisee');
    const submitBtn = document.querySelector('button[onclick="addToCart()"]');
    
    const slotSelect = document.getElementById('config-creneau-location');
    const slotType = slotSelect ? slotSelect.value : 'VenDim';
    const slotDef = SLOT_DEFS[slotType] || SLOT_DEFS['VenDim'];

    if (!dateInput || !submitBtn) return;

    // 1. SÉCURITÉ : CHAMP VIDE
    if (!dateInput.value) {
        if (alertEpuise) alertEpuise.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        submitBtn.innerHTML = 'Sélectionnez une date <i class="fa-solid fa-calendar-day ml-2 text-xl"></i>';
        return;
    }

	// 2. SÉCURITÉ : VÉRIFICATION DU JOUR DE LA SEMAINE (selon le créneau choisi)
    if (!isValidSlotDay(dateInput.value, slotType)) {
        if (alertEpuise) {
            alertEpuise.classList.remove('hidden');
            alertEpuise.classList.add('flex');
            const spanEl = alertEpuise.querySelector('span');
            if (spanEl) spanEl.textContent = `Veuillez sélectionner un jour du créneau "${slotDef.label}".`;
        }
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        submitBtn.innerHTML = 'Jour invalide <i class="fa-solid fa-ban ml-2 text-xl"></i>';
        return;
    }

    const dateSelectionnee = getSlotAnchor(dateInput.value, slotType);

    // 3. SÉCURITÉ : DATE INDISPONIBLE
    if (dateSelectionnee && unavailableRentalDates.includes(dateSelectionnee)) {
        if (alertEpuise) {
            alertEpuise.classList.remove('hidden');
            alertEpuise.classList.add('flex');
        }
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        submitBtn.innerHTML = 'Date indisponible <i class="fa-solid fa-ban ml-2 text-xl"></i>';
    } else {
    // 4. TOUT EST OK : ON DÉBLOQUE
        if (alertEpuise) alertEpuise.classList.add('hidden');
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        submitBtn.innerHTML = 'Ajouter au panier <i class="fa-solid fa-cart-plus ml-2 text-xl"></i>';
    }
}

async function fetchUnavailableTestDates() {
    try {
        const response = await fetch(`${API_URL}?action=getUnavailableTestDates`);
        unavailableTestDates = await response.json();
        checkTestDateAvailability();
    } catch (error) {
        console.error("Impossible de charger le calendrier d'essai :", error);
    }
}

function checkTestDateAvailability() {
    if (!isCurrentItemTestProgram) return;

    renderTestCalendar();

    const dateInput = document.getElementById('config-date-test');
    const alertEpuise = document.getElementById('alert-test-epuisee');
    const submitBtn = document.querySelector('button[onclick="addToCart()"]');
    
    const slotSelectTest = document.getElementById('config-creneau-test');
    const slotTypeTest = slotSelectTest ? slotSelectTest.value : 'VenDim';
    const slotDefTest = SLOT_DEFS[slotTypeTest] || SLOT_DEFS['VenDim'];

    if (!dateInput || !submitBtn) return;

    // 1. SÉCURITÉ : CHAMP VIDE
    if (!dateInput.value) {
        if (alertEpuise) alertEpuise.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        submitBtn.innerHTML = 'Sélectionnez une date <i class="fa-solid fa-calendar-day ml-2 text-xl"></i>';
        return;
    }

	// 2. SÉCURITÉ : VÉRIFICATION DU JOUR DE LA SEMAINE (selon le créneau choisi)
    if (!isValidSlotDay(dateInput.value, slotTypeTest)) {
        if (alertEpuise) {
            alertEpuise.classList.remove('hidden');
            alertEpuise.classList.add('flex');
            const spanEl = alertEpuise.querySelector('span');
            if (spanEl) spanEl.textContent = `Veuillez sélectionner un jour du créneau "${slotDefTest.label}".`;
        }
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        submitBtn.innerHTML = 'Jour invalide <i class="fa-solid fa-ban ml-2 text-xl"></i>';
        return;
    }

    const dateSelectionnee = getSlotAnchor(dateInput.value, slotTypeTest);

    // Détermine quel pool de dispo consulter selon le modèle choisi (2 paires distinctes)
    const selectModeleTest = document.getElementById('config-modele-test');
    const modeleValTest = selectModeleTest ? selectModeleTest.value : "GHOST 50mm (Paire)";
    const modeleKeyTest = modeleValTest.indexOf('60') !== -1 ? '6065' : '50';
    const listeIndispoModele = (unavailableTestDates && unavailableTestDates[modeleKeyTest]) ? unavailableTestDates[modeleKeyTest] : [];

    // 3. SÉCURITÉ : DATE INDISPONIBLE (pour le modèle sélectionné)
    if (dateSelectionnee && listeIndispoModele.includes(dateSelectionnee)) {
        if (alertEpuise) {
            alertEpuise.classList.remove('hidden');
            alertEpuise.classList.add('flex');
        }
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        submitBtn.innerHTML = 'Date indisponible <i class="fa-solid fa-ban ml-2 text-xl"></i>';
    } else {
    // 4. TOUT EST OK : ON DÉBLOQUE
        if (alertEpuise) alertEpuise.classList.add('hidden');
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        submitBtn.innerHTML = 'Ajouter au panier <i class="fa-solid fa-cart-plus ml-2 text-xl"></i>';
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
        
        // --- NETTOYAGE DU CONTENU DE LA CONFIGURATION ---
        // Règles génériques par mot-clé plutôt que par texte/prix exact : ça reste
        // valable même si les libellés ou tarifs des options changent dans l'index.html.
        let optionsModifiees = false;

        // Catégories dont le prix est visible dans le texte, ex: " | + 2x TPU 65mm [+25€]".
        // Le prix est capturé directement dans le texte, donc pas besoin de le lister à la main.
        const reglesAvecPrixVisible = [
            / \| \+ [^|]*Pneus Continental GP5000[^|]*\[\+(\d+)€\]/g,
            / \| \+ [^|]*Kits? Aéro[^|]*\[\+(\d+)€\]/g,
            / \| \+ \d+x Chambres TPU \d+mm \[\+(\d+)€\]/g,
            / \| \+ Kit de réparation RideNow TPU \[\+(\d+)€\]/g,
            / \| \+ [^|]*Paires? Plaquettes (?:SHIMANO|SRAM)[^|]*\[\+(\d+)€\]/g,
            / \| \+ [^|]*Housses? de transport[^|]*\[\+(\d+)€\]/g,
            / \| \+ Paire Lockrings [^|]*\[\+(\d+)€\]/g,
        ];

        // Catégories où le prix n'apparaît pas dans le texte (ex: disques de frein) :
        // le tarif est déduit du mot-clé plutôt que du texte.
        const reglesSansPrixVisible = [
            { regex: / \| \+ [^|]*Road Wave[^|]*/g, prix: 119 },
            { regex: / \| \+ [^|]*Disc Shark[^|]*/g, prix: 159 },
        ];

        cart.forEach(item => {
            if (item.config && !item.isAccessory && !item.isTextile) {
                const configOriginale = item.config;
                let montantRetire = 0;

                reglesAvecPrixVisible.forEach(regex => {
                    item.config = item.config.replace(regex, (match, prixCapture) => {
                        montantRetire += parseInt(prixCapture) || 0;
                        return "";
                    });
                });

                reglesSansPrixVisible.forEach(({ regex, prix }) => {
                    item.config = item.config.replace(regex, (match) => {
                        montantRetire += prix;
                        return "";
                    });
                });

                // Catégories génériques sans prix associé (cassette du client, etc.)
                item.config = item.config
                    .replace(/ \| \+ Cassette [^|]+/g, "")
                    .replace(/ \| \+ Bidon [^|]+/g, "");

                if (item.config !== configOriginale) {
                    optionsModifiees = true;
                    item.price -= montantRetire;
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
        alertText.innerHTML = message; // <-- On utilise innerHTML ici
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

// =========================================================================
// CRÉNEAUX DE LOCATION/ESSAI EN SEMAINE (depuis l'ouverture aux 3 créneaux hebdomadaires) :
// chaque créneau dure 2 jours/2 nuits, remise au client en fin d'après-midi/soir (~18h) du
// jour de début, retour avant 18h le dernier jour. Le "jour d'ancrage" (anchorIso, en jour ISO
// 1=Lundi..7=Dimanche) est le jour de DÉBUT du créneau, utilisé comme date de référence pour le
// stock et le tarif dégressif.
// =========================================================================
const SLOT_DEFS = {
    "LunMer": { anchorIso: 1, validIso: [1, 2, 3], label: "Lundi → Mercredi" },
    "MerVen": { anchorIso: 3, validIso: [3, 4, 5], label: "Mercredi → Vendredi" },
    "VenDim": { anchorIso: 5, validIso: [5, 6, 7], label: "Vendredi → Dimanche" }
};

function isoWeekday(jsDay) {
    return jsDay === 0 ? 7 : jsDay; // JS: 0=Dimanche..6=Samedi -> ISO: 1=Lundi..7=Dimanche
}

// Une date est valide pour un créneau donné si son jour de semaine tombe dans les jours couverts
// par ce créneau (ex: Mercredi et Jeudi sont valides pour "MerVen", pas pour "LunMer").
function isValidSlotDay(dateStr, slotType) {
    if (!dateStr || !SLOT_DEFS[slotType]) return false;
    const parts = dateStr.split('-');
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return SLOT_DEFS[slotType].validIso.indexOf(isoWeekday(d.getDay())) !== -1;
}

// Ramène n'importe quelle date valide pour le créneau donné à la date de DÉBUT de ce créneau
// (ex: Jeudi -> Mercredi de la même semaine pour "MerVen"). Retourne "" si le jour ne correspond
// pas au créneau choisi.
function getSlotAnchor(dateStr, slotType) {
    if (!isValidSlotDay(dateStr, slotType)) return "";
    const parts = dateStr.split('-');
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const def = SLOT_DEFS[slotType];
    d.setDate(d.getDate() - (isoWeekday(d.getDay()) - def.anchorIso));
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
}

// =========================================================================
// MINI-CALENDRIER VISUEL (location + essai) : remplace le champ date natif du navigateur (qui ne
// permet pas d'afficher les dates déjà réservées). Lit les listes déjà récupérées côté client
// (unavailableRentalDates / unavailableTestDates) pour griser/barrer les dates complètes, et
// n'active que les jours valides pour le créneau actuellement sélectionné. Le champ <input
// type="date"> d'origine est conservé caché : il continue de porter la valeur sélectionnée, toute
// la logique en aval (checkDateAvailability, updateConfig, etc.) n'a donc pas besoin de changer.
// =========================================================================
const MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const JOURS_COURTS_FR = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
const calendarState = {}; // { [containerId]: { year, month } }, month = 0-11

function kcalPad2(n) { return String(n).padStart(2, '0'); }
function kcalDateStr(y, m, d) { return `${y}-${kcalPad2(m + 1)}-${kcalPad2(d)}`; }

function renderMiniCalendar(opts) {
    const container = document.getElementById(opts.containerId);
    if (!container) return;

    if (!calendarState[opts.containerId]) {
        const today = new Date();
        calendarState[opts.containerId] = { year: today.getFullYear(), month: today.getMonth() };
    }
    const state = calendarState[opts.containerId];

    const dateInput = document.getElementById(opts.dateInputId);
    const slotSelect = document.getElementById(opts.slotSelectId);
    const slotType = slotSelect ? slotSelect.value : 'VenDim';
    const unavailableList = opts.getUnavailableList ? (opts.getUnavailableList() || []) : [];
    const selectedValue = dateInput ? dateInput.value : "";

    const now = new Date();
    const todayStr = kcalDateStr(now.getFullYear(), now.getMonth(), now.getDate());

    const firstOfMonth = new Date(state.year, state.month, 1);
    let startOffset = firstOfMonth.getDay() - 1; // grille démarre un Lundi
    if (startOffset < 0) startOffset = 6;
    const daysInMonth = new Date(state.year, state.month + 1, 0).getDate();

    let cellsHtml = "";
    for (let i = 0; i < startOffset; i++) {
        cellsHtml += `<div class="kcal-cell kcal-empty"></div>`;
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const dStr = kcalDateStr(state.year, state.month, day);
        const isPast = dStr < todayStr;
        const validDay = !isPast && isValidSlotDay(dStr, slotType);
        let stateClass = "kcal-disabled";
        let clickable = false;
        if (validDay) {
            const anchor = getSlotAnchor(dStr, slotType);
            if (anchor && unavailableList.indexOf(anchor) !== -1) {
                stateClass = "kcal-booked";
            } else {
                stateClass = "kcal-available";
                clickable = true;
            }
        }
        if (dStr === selectedValue) stateClass += " kcal-selected";
        cellsHtml += `<div class="kcal-cell ${stateClass}"${clickable ? ` data-date="${dStr}"` : ''}>${day}</div>`;
    }

    container.innerHTML =
        `<div class="kcal-header">
            <button type="button" class="kcal-nav" data-nav="-1">&lsaquo;</button>
            <span class="kcal-month-label">${MOIS_FR[state.month]} ${state.year}</span>
            <button type="button" class="kcal-nav" data-nav="1">&rsaquo;</button>
        </div>
        <div class="kcal-grid kcal-grid-header">${JOURS_COURTS_FR.map(j => `<div class="kcal-daylabel">${j}</div>`).join('')}</div>
        <div class="kcal-grid">${cellsHtml}</div>
        <div class="kcal-legend">
            <span><i class="kcal-dot kcal-dot-available"></i> Disponible</span>
            <span><i class="kcal-dot kcal-dot-booked"></i> Complet</span>
        </div>`;

    container.querySelectorAll('.kcal-nav').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const dir = parseInt(btn.getAttribute('data-nav'), 10);
            state.month += dir;
            if (state.month < 0) { state.month = 11; state.year--; }
            if (state.month > 11) { state.month = 0; state.year++; }
            renderMiniCalendar(opts);
        });
    });

    container.querySelectorAll('.kcal-cell[data-date]').forEach(function (cell) {
        cell.addEventListener('click', function () {
            const dStr = cell.getAttribute('data-date');
            if (dateInput) dateInput.value = dStr;
            renderMiniCalendar(opts);
            if (opts.onSelect) opts.onSelect();
        });
    });
}

function renderLocationCalendar() {
    renderMiniCalendar({
        containerId: 'calendar-location',
        dateInputId: 'config-date-location',
        slotSelectId: 'config-creneau-location',
        getUnavailableList: function () { return unavailableRentalDates; },
        onSelect: function () { checkDateAvailability(); updateConfig(); }
    });
}

function renderTestCalendar() {
    renderMiniCalendar({
        containerId: 'calendar-test',
        dateInputId: 'config-date-test',
        slotSelectId: 'config-creneau-test',
        getUnavailableList: function () {
            const sel = document.getElementById('config-modele-test');
            const modeleVal = sel ? sel.value : "GHOST 50mm (Paire)";
            const key = modeleVal.indexOf('60') !== -1 ? '6065' : '50';
            return (unavailableTestDates && unavailableTestDates[key]) ? unavailableTestDates[key] : [];
        },
        onSelect: function () { checkTestDateAvailability(); updateConfig(); }
    });
}

// Tarif dégressif de location des roues lenticulaires selon la proximité de la date choisie
// (calculée par rapport au jour de DÉBUT du créneau sélectionné, aujourd'hui inclus), identique
// quel que soit le créneau (Lun->Mer / Mer->Ven / Ven->Dim) :
//   > 14 jours avant  -> 100€
//   entre 7 et 14 jours -> 75€
//   < 7 jours -> 50€
function getLentiTarifDynamique(dateInputValue, slotType) {
    if (!dateInputValue) return 100;
    const anchor = getSlotAnchor(dateInputValue, slotType || 'VenDim');
    if (!anchor) return 100;
    const parts = anchor.split('-');
    const eventDate = new Date(parts[0], parts[1] - 1, parts[2]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    const daysUntil = Math.round((eventDate - today) / (1000 * 60 * 60 * 24));
    if (daysUntil > 14) return 100;
    if (daysUntil > 7) return 75;
    return 50; // à 7 jours pile ou moins
}

// Conservée pour compatibilité (plus utilisée par le nouveau flux créneaux, cf. getSlotAnchor).
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

function openSizeGuide() {
    const modal = document.getElementById('size-guide-modal');
    if(modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.style.zIndex = "9999";
    }
}

function closeSizeGuide() {
    const modal = document.getElementById('size-guide-modal');
    if(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// --- FONCTIONS D'INFORMATIONS DU CONFIGURATEUR ---

function showInfoRayons() {
    const texte = `
        <div class="text-left space-y-3 text-gray-600 text-sm">
            <p>Les rayons en carbone suppriment la flexion latérale : 100% de vos watts vont dans la route.</p>
            <ul class="space-y-2">
                <li><b class="text-gray-900">T32 (2.1g) :</b> Le plus léger. Profil fin. Maximise le gain de poids pour les purs grimpeurs.</li>
                <li><b class="text-gray-900">T33 (3.2g) :</b> L'équilibre parfait entre profil aérodynamique et rigidité brutale. Idéal sur tous les terrains.</li>
                <li><b class="text-gray-900">T40 (3.3g) :</b> Profil élargi. Coupe le vent de face de manière optimale pour les rouleurs.</li>
                <li><b class="text-gray-900">T52 (5.2g) :</b> Rigidité maximale absolue. Conçu pour encaisser la puissance des purs sprinteurs et des pistards.</li>
            </ul>
        </div>
    `;
    showCustomAlert(texte);
}

function showInfoRatchet() {
    const texte = `
        <div class="text-left space-y-3 text-gray-600 text-sm">
            <p>Le Ratchet est le système cranté dans le moyeu arrière qui s'enclenche quand vous pédalez (et qui fait le fameux bruit en roue libre).</p>
            <ul class="space-y-2">
                <li><b class="text-gray-900">45T (Engagement 8°) :</b> L'équilibre idéal. Réactivité excellente, friction minimale en roue libre, et grande durabilité. Bruit "bourdonnement" net.</li>
                <li><b class="text-gray-900">54T (Engagement 6.6°) :</b> Standard sur nos moyeux RT240 ultra-légers.</li>
                <li><b class="text-gray-900">72T (Engagement 5°) :</b> ⚡ Réactivité instantanée ! La puissance passe à la seconde où vous touchez la pédale (idéal pour les relances en bosse ou les critériums). Le bruit est plus aigu ("essaim d'abeilles").</li>
            </ul>
        </div>
    `;
    showCustomAlert(texte);
}

function showInfoMtbHubs() {
    const texte = `
        <div class="text-left space-y-3 text-gray-600 text-sm">
            <p>Notre gamme de moyeux VTT (DFS APEX) :</p>
            <ul class="space-y-2">
                <li><b class="text-gray-900">DMB1 (6-Trous) :</b> Le standard robuste. Alliage 6061 forgé, roulements S&S. (Ratchet 36T/54T).</li>
                <li><b class="text-gray-900">DMC1 (Centerlock) :</b> Même conception que le DMB1 mais format Centerlock (Shimano). Poids légèrement réduit (310g).</li>
                <li><b class="text-gray-900">DMT1 (Rayons Carbone) :</b> Notre fleuron Ultra-Light. Usiné pour nos rayons carbones (T33/T40/T52). Allège drastiquement la roue.</li>
                <li><b class="text-gray-900">DMB2 (SSF System) :</b> L'équivalent VTT de notre fameux R2. Roulements surdimensionnés, ratchet haute réactivité (45T/72T) et coloris au choix.</li>
            </ul>
        </div>
    `;
    showCustomAlert(texte);
}

function showPictureGeneric(keyword) {
    // 1. Recherche du produit dans le catalogue complet rechargé du Sheets
    const produit = globalCatalogue.find(item => item.Nom && item.Nom.toLowerCase().includes(keyword.toLowerCase()));
    
    // 2. Si le produit est trouvé et contient un lien d'image
    if (produit && produit.Image) {
        const urlImage = produit.Image.split(',')[0].trim();
        
        // 3. On pousse la photo dans le grand bloc de gauche
        changeModalMedia(urlImage);
    } else {
        showCustomAlert("La photo de cet accessoire est en cours de chargement à l'atelier. 🌋");
    }
}

// ==========================================
// CALCULATEUR DE PRESSION PRO - KARBÒN PÉI
// ==========================================

function calculatePressure() {
    // 1. Récupération des données du formulaire
    const totalWeight = parseFloat(document.getElementById('calc-weight-sys').value);
    const weightDistFront = parseFloat(document.getElementById('calc-dist').value) / 100;
    const weightDistRear = 1 - weightDistFront;
    const statedWidth = parseFloat(document.getElementById('calc-tire').value);
    const internalRim = parseFloat(document.getElementById('calc-rim-int').value);
    const externalRim = parseFloat(document.getElementById('calc-rim-ext').value);
    const setupType = document.getElementById('calc-type').value;
    const surface = document.getElementById('calc-surface').value;

    if (isNaN(totalWeight) || totalWeight <= 0) return;

    // 2. Calcul du WAM (Width As Measured) - La largeur réelle du pneu
    // Règle générale : le pneu s'élargit de ~0.4mm pour chaque 1mm de jante interne au-delà du standard 19mm.
    let wam = statedWidth + ((internalRim - 19) * 0.4);

    // 3. Vérification Aérodynamique (Règle des 105%)
    const aeroWarning = document.getElementById('aero-warning');
    if (wam > externalRim) {
        aeroWarning.innerHTML = `<strong><i class="fa-solid fa-wind"></i> Alerte Aérodynamique :</strong> Votre pneu mesurera en réalité environ <strong>${wam.toFixed(1)} mm</strong> (WAM) sur cette jante. C'est plus large que votre jante externe (${externalRim} mm). L'air ne s'écoulera pas de manière fluide. Considérez un pneu plus fin pour optimiser l'aéro.`;
        aeroWarning.classList.remove('hidden');
    } else {
        aeroWarning.classList.add('hidden');
    }

    // 4. Calcul de la pression de base (Ciblage parfait entre SRAM et Silca)
    // On utilise la répartition brute sélectionnée par le client.
    let frontLoad = totalWeight * weightDistFront;
    let rearLoad = totalWeight * weightDistRear;

    // Nouvelle équation avec constante (+1.4) pour resserrer l'écart Av/Ar sans fausser la répartition
    let frontPressureBar = ((frontLoad * 2.4) / wam) + 1.4;
    let rearPressureBar = ((rearLoad * 2.4) / wam) + 1.4;

    // 5. Modificateurs selon le type de montage (Carcasse)
    if (setupType === 'tubeless') {
        frontPressureBar -= 0.30; 
        rearPressureBar -= 0.30;
    } else if (setupType === 'tpu') {
        frontPressureBar -= 0.15; 
        rearPressureBar -= 0.15;
    } else if (setupType === 'butyl') {
        frontPressureBar += 0.15; 
        rearPressureBar += 0.15;
    }

    // 6. Modificateurs selon la surface de roulage
    if (surface === 'neuf') {
        frontPressureBar *= 1.03; // Rendement maximal
        rearPressureBar *= 1.03;
    } else if (surface === 'gravel') {
        frontPressureBar *= 0.70; // Chute pour le confort et l'adhérence VTT/Gravel
        rearPressureBar *= 0.70;
    }

    // Sécurité basse : Ne pas descendre sous 1.8 Bar pour éviter le déjantage
    frontPressureBar = Math.max(frontPressureBar, 1.8);
    rearPressureBar = Math.max(rearPressureBar, 1.8);

    // 7. Affichage UI
    document.getElementById('res-front-bar').innerText = frontPressureBar.toFixed(2);
    document.getElementById('res-rear-bar').innerText = rearPressureBar.toFixed(2);

    const resultsDiv = document.getElementById('pressure-results');
    resultsDiv.classList.remove('hidden');
    resultsDiv.classList.add('animate-pulse');
    setTimeout(() => resultsDiv.classList.remove('animate-pulse'), 500);
}

loadCatalogue();
