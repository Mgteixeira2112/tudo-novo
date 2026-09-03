INSERT INTO public.minibar_items (id,name,category,price,stock_qty,unit) VALUES
('mb_01','Água Mineral sem Gás 500ml','Bebidas',8,120,'un'),
('mb_02','Água Mineral com Gás 500ml','Bebidas',9,100,'un'),
('mb_03','Refrigerante Lata 350ml','Bebidas',12,80,'un'),
('mb_04','Cerveja Artesanal IPA 355ml','Bebidas',24,60,'un'),
('mb_05','Cerveja Long Neck Stella Artois','Bebidas',18,75,'un'),
('mb_06','Vinho Tinto Cabernet 375ml','Vinhos',75,30,'un'),
('mb_07','Espumante Brut Chandon 187ml','Vinhos',65,25,'un'),
('mb_08','Castanhas de Caju Nobres 80g','Snacks',22,50,'pct'),
('mb_09','Batata Pringles Original 40g','Snacks',18,45,'un'),
('mb_10','Chocolate Fino Lindt 100g','Doces',28,40,'barra')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.inventory_items (id,sku,name,sector,category,current_stock,min_stock,max_stock,unit,cost_price,selling_price,supplier,location_barcode,linked_minibar_item_id,linked_menu_item_id,updated_at) VALUES
('inv_mb_001','FRIG-AGUA-500','Água Mineral sem Gás 500ml','Frigobar','Bebidas',48,25,120,'un',2.2,8,'Distribuidora Cristal das Águas','78910001001','mb_001',NULL,'2026-09-02T10:00:00Z'),
('inv_mb_002','FRIG-CERV-CORONA','Cerveja Corona Extra 330ml','Frigobar','Bebidas',32,20,80,'un',6.5,18,'Ambev Regional','78910001002','mb_002',NULL,'2026-09-02T10:00:00Z'),
('inv_mb_003','FRIG-VINHO-MALBEC','Vinho Tinto Malbec Reserva 375ml','Frigobar','Vinhos',14,10,30,'un',28,65,'Adega Gran Sul Importados','78910001003','mb_003',NULL,'2026-09-02T10:00:00Z'),
('inv_mb_004','FRIG-CAST-CAJU','Castanhas de Caju Premium 100g','Frigobar','Snacks',22,15,50,'un',8,22,'Nordeste Castanhas Gourmet','78910001004','mb_004',NULL,'2026-09-02T10:00:00Z'),
('inv_mb_005','FRIG-CHOC-70','Chocolate Artesanal 70% Cacau 80g','Frigobar','Doces',8,15,40,'un',6,16,'Chocolataria da Serra','78910001005','mb_005',NULL,'2026-09-02T10:00:00Z'),
('inv_mb_006','FRIG-COCA-LATA','Refrigerante Coca-Cola 350ml','Frigobar','Bebidas',40,20,100,'un',3.1,9,'Coca-Cola FEMSA Distribuição','78910001006','mb_006',NULL,'2026-09-02T10:00:00Z'),
('inv_ab_001','AB-CAFE-GRAOS-KG','Café Especial em Grãos Arábica 100% 1kg','Alimentos_Bebidas','Bebidas & Matérias-Primas',18,10,40,'kg',48,0,'Torrefação Mogiana Premium','78920002001',NULL,NULL,'2026-09-02T10:00:00Z'),
('inv_ab_002','AB-FILE-MIGNON-KG','Filé Mignon Bovino Porcionado Limpo 1kg','Alimentos_Bebidas','Carnes & Proteínas',6,12,30,'kg',62,0,'Frigorífico Premium Carnes Nobres','78920002002',NULL,NULL,'2026-09-02T10:00:00Z'),
('inv_ab_003','AB-QUEIJO-BRIE-KG','Queijo Francês Brie Seleção Especial 1kg','Alimentos_Bebidas','Laticínios',9,5,20,'kg',75,0,'Laticínios Serra Bella','78920002003',NULL,NULL,'2026-09-02T10:00:00Z'),
('inv_ab_004','AB-CAMARAO-VG-KG','Camarão Rosa VG Descascado Congelado 1kg','Alimentos_Bebidas','Pescados & Frutos do Mar',4,8,25,'kg',98,0,'Pescados da Ilha Distribuidora','78920002004',NULL,NULL,'2026-09-02T10:00:00Z'),
('inv_ab_005','AB-AZEITE-EV-500','Azeite de Oliva Extra Virgem 0.2% Acidez 500ml','Alimentos_Bebidas','Mercearia Fina',24,12,48,'un',38,0,'Olivas do Sul Empório','78920002005',NULL,NULL,'2026-09-02T10:00:00Z'),
('inv_gov_001','GOV-AMEN-SHAMP-50','Kit Amenities Shampoo & Condicionador Alecrim 50ml','Governanca_Enxoval','Amenities de Quarto',120,60,300,'un',3.5,0,'EcoSpa Cosméticos Naturais','78930003001',NULL,NULL,'2026-09-02T10:00:00Z'),
('inv_gov_002','GOV-AMEN-SABON-BARRA','Sabonete Vegetal Karité e Algodão 40g','Governanca_Enxoval','Amenities de Quarto',140,80,400,'un',1.8,0,'EcoSpa Cosméticos Naturais','78930003002',NULL,NULL,'2026-09-02T10:00:00Z'),
('inv_gov_003','GOV-ENX-TOALHA-BANHO','Toalha de Banho 550g/m² Algodão Egípcio Branca','Governanca_Enxoval','Enxoval & Rouparia',65,40,120,'un',42,0,'Têxtil Hotelaria Brasil','78930003003',NULL,NULL,'2026-09-02T10:00:00Z'),
('inv_gov_004','GOV-ENX-LENCOL-KING','Jogo Lençol King Size 400 Fios Cetim Algodão','Governanca_Enxoval','Enxoval & Rouparia',28,20,60,'un',110,0,'Têxtil Hotelaria Brasil','78930003004',NULL,NULL,'2026-09-02T10:00:00Z'),
('inv_gov_005','GOV-LIMP-DESINF-5L','Desinfetante Hospitalar Concentrado Lavanda 5L','Governanca_Enxoval','Produtos de Higienização',7,10,25,'un',55,0,'Química Limpeza Profissional','78930003005',NULL,NULL,'2026-09-02T10:00:00Z'),
('inv_man_001','MAN-LAMP-LED-9W','Lâmpada LED Dimerizável Branco Quente 9W E27','Manutencao','Elétrica & Iluminação',34,20,80,'un',14.5,0,'Eletro Luz & Ferragens','78940004001',NULL,NULL,'2026-09-02T10:00:00Z'),
('inv_man_002','MAN-PILHA-AAA-PCT','Pilhas Alcalinas AAA Cartela c/ 4un (Controles/Fechaduras)','Manutencao','Elétrica & Automação',16,12,50,'pct',18,0,'Eletro Luz & Ferragens','78940004002',NULL,NULL,'2026-09-02T10:00:00Z'),
('inv_man_003','MAN-FILTRO-AR-SPLIT','Filtro Antibacteriano Reposição Ar Condicionado Split','Manutencao','Climatização & Refrigeração',5,10,25,'un',45,0,'ClimaTech Refrigeração','78940004003',NULL,NULL,'2026-09-02T10:00:00Z'),
('inv_alm_001','ALM-PAPEL-HIG-CX','Papel Higiênico Folha Tripla Caixa c/ 64 Rolos','Almoxarifado','Consumíveis Gerais',14,8,30,'cx',120,0,'Papéis & Celulose Rio Verde','78950005001',NULL,NULL,'2026-09-02T10:00:00Z'),
('inv_alm_002','ALM-FARDO-AGUA-CX','Fardo Água Mineral 500ml c/ 12 Unidades (Pulmão Central)','Almoxarifado','Estoque Pulmão A&B',45,25,100,'fardo',22,0,'Distribuidora Cristal das Águas','78950005002',NULL,NULL,'2026-09-02T10:00:00Z'),
('inv_alm_003','ALM-TACA-CRISTAL-CX','Taças de Cristal Sommelier p/ Vinho Cx c/ 6un','Almoxarifado','Utensílios & Enxoval',10,6,25,'cx',165,0,'Cristais Bohemia Brasil','78950005003',NULL,NULL,'2026-09-02T10:00:00Z')
ON CONFLICT (id) DO NOTHING;
