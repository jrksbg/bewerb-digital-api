-- CreateTable
CREATE TABLE `Account` (
    `userId` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerAccountId` VARCHAR(191) NULL,
    `access_token` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`userId`, `provider`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuestionCatalog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MultipleChoiceQuestion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `text` VARCHAR(191) NOT NULL,
    `questionCatalogId` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MultipleChoiceQuestionAnswer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `text` VARCHAR(191) NOT NULL,
    `correctAnswer` BOOLEAN NOT NULL DEFAULT false,
    `questionId` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Praxisstation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `szenarioBeschreibung` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PraxisstationMasterfrage` (
    `praxisstationId` INTEGER NOT NULL,
    `frage` VARCHAR(191) NOT NULL,
    `antwort1` VARCHAR(191) NOT NULL,
    `antwort2` VARCHAR(191) NOT NULL,
    `antwort3` VARCHAR(191) NOT NULL,
    `punkte` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`praxisstationId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bewerbstation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `helfiFragenkatalogId` INTEGER NULL,
    `jugend1FragenkatalogId` INTEGER NULL,
    `jugend2FragenkatalogId` INTEGER NULL,
    `helfiPraxisstationId` INTEGER NULL,
    `jugend1PraxisstationId` INTEGER NULL,
    `jugend2PraxisstationId` INTEGER NULL,
    `sozialstationId` INTEGER NULL,
    `zivilcouragestationId` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BewerbstationBewerter` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hauptbewerter` BOOLEAN NOT NULL DEFAULT false,
    `praxisstationId` INTEGER NOT NULL,
    `additionalNote` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bewertungskriterium` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `text` VARCHAR(191) NOT NULL,
    `punkte` INTEGER NOT NULL,
    `bewerterId` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bewerbsteam` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `jugendgruppe` VARCHAR(191) NULL,
    `altersklasse` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bewerbsteilnehmer` (
    `pernr` INTEGER NOT NULL,
    `bewerbsteamId` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`pernr`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Whitelist` (
    `pernr` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL DEFAULT 'Bewerter',
    `tag` VARCHAR(191) NOT NULL DEFAULT 'BEW',
    `vorname` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`pernr`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PraxisBewertung` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `gruppeId` INTEGER NOT NULL,
    `stationId` INTEGER NOT NULL,
    `masterfrage` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PraxisBewertung_gruppeId_stationId_key`(`gruppeId`, `stationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BewertungskriteriumBewertung` (
    `kriteriumId` INTEGER NOT NULL,
    `bewertungId` INTEGER NOT NULL,
    `startnummer` INTEGER NULL,
    `rating` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`kriteriumId`, `bewertungId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TheorieBewertung` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `gruppeId` INTEGER NOT NULL,
    `stationId` INTEGER NOT NULL,
    `teilnehmerId` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TheorieBewertung_gruppeId_stationId_teilnehmerId_key`(`gruppeId`, `stationId`, `teilnehmerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TheorieAntworten` (
    `bewertungId` INTEGER NOT NULL,
    `antwortId` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`bewertungId`, `antwortId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SozialBewertung` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `gruppeId` INTEGER NOT NULL,
    `stationId` INTEGER NOT NULL,
    `helfiRundeId` INTEGER NULL,
    `jugendBegriffId` INTEGER NULL,
    `erkannt` BOOLEAN NOT NULL,
    `grundsatzErkannt` BOOLEAN NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SozialBewertung_gruppeId_stationId_helfiRundeId_jugendBegrif_key`(`gruppeId`, `stationId`, `helfiRundeId`, `jugendBegriffId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sozialstation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SozialstationHelfiRunde` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bild` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `punkteProTeilnehmer` INTEGER NOT NULL,
    `sozialstationId` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SozialstationJugendBegriff` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `begriff` VARCHAR(191) NOT NULL,
    `grundsatz` BOOLEAN NOT NULL DEFAULT false,
    `punkteErraten` INTEGER NOT NULL,
    `punkteGrundsatz` INTEGER NULL,
    `sozialstationId` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ZivilcourageBewertung` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `gruppeId` INTEGER NOT NULL,
    `stationId` INTEGER NOT NULL,
    `helfiAussageId` INTEGER NULL,
    `jugendBegriffId` INTEGER NULL,
    `anzahlRichtigStehend` INTEGER NULL,
    `erkannt` BOOLEAN NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ZivilcourageBewertung_gruppeId_stationId_helfiAussageId_juge_key`(`gruppeId`, `stationId`, `helfiAussageId`, `jugendBegriffId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ZivilcurageStation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ZivilcurageHelfiAussage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `aussage` VARCHAR(191) NOT NULL,
    `antwort1` VARCHAR(191) NULL,
    `antwort2` VARCHAR(191) NULL,
    `antwort3` VARCHAR(191) NULL,
    `punkteProTeilnehmer` INTEGER NOT NULL,
    `zivilcurageStationId` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ZivilcurageJugendBegriff` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `begriff` VARCHAR(191) NOT NULL,
    `darstellungsart` VARCHAR(191) NOT NULL,
    `punkte` INTEGER NOT NULL,
    `zivilcurageStationId` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MultipleChoiceQuestion` ADD CONSTRAINT `MultipleChoiceQuestion_questionCatalogId_fkey` FOREIGN KEY (`questionCatalogId`) REFERENCES `QuestionCatalog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MultipleChoiceQuestionAnswer` ADD CONSTRAINT `MultipleChoiceQuestionAnswer_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `MultipleChoiceQuestion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PraxisstationMasterfrage` ADD CONSTRAINT `PraxisstationMasterfrage_praxisstationId_fkey` FOREIGN KEY (`praxisstationId`) REFERENCES `Praxisstation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bewerbstation` ADD CONSTRAINT `Bewerbstation_helfiFragenkatalogId_fkey` FOREIGN KEY (`helfiFragenkatalogId`) REFERENCES `QuestionCatalog`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bewerbstation` ADD CONSTRAINT `Bewerbstation_jugend1FragenkatalogId_fkey` FOREIGN KEY (`jugend1FragenkatalogId`) REFERENCES `QuestionCatalog`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bewerbstation` ADD CONSTRAINT `Bewerbstation_jugend2FragenkatalogId_fkey` FOREIGN KEY (`jugend2FragenkatalogId`) REFERENCES `QuestionCatalog`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bewerbstation` ADD CONSTRAINT `Bewerbstation_helfiPraxisstationId_fkey` FOREIGN KEY (`helfiPraxisstationId`) REFERENCES `Praxisstation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bewerbstation` ADD CONSTRAINT `Bewerbstation_jugend1PraxisstationId_fkey` FOREIGN KEY (`jugend1PraxisstationId`) REFERENCES `Praxisstation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bewerbstation` ADD CONSTRAINT `Bewerbstation_jugend2PraxisstationId_fkey` FOREIGN KEY (`jugend2PraxisstationId`) REFERENCES `Praxisstation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bewerbstation` ADD CONSTRAINT `Bewerbstation_sozialstationId_fkey` FOREIGN KEY (`sozialstationId`) REFERENCES `Sozialstation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bewerbstation` ADD CONSTRAINT `Bewerbstation_zivilcouragestationId_fkey` FOREIGN KEY (`zivilcouragestationId`) REFERENCES `ZivilcurageStation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BewerbstationBewerter` ADD CONSTRAINT `BewerbstationBewerter_praxisstationId_fkey` FOREIGN KEY (`praxisstationId`) REFERENCES `Praxisstation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bewertungskriterium` ADD CONSTRAINT `Bewertungskriterium_bewerterId_fkey` FOREIGN KEY (`bewerterId`) REFERENCES `BewerbstationBewerter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bewerbsteilnehmer` ADD CONSTRAINT `Bewerbsteilnehmer_bewerbsteamId_fkey` FOREIGN KEY (`bewerbsteamId`) REFERENCES `Bewerbsteam`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PraxisBewertung` ADD CONSTRAINT `PraxisBewertung_gruppeId_fkey` FOREIGN KEY (`gruppeId`) REFERENCES `Bewerbsteam`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PraxisBewertung` ADD CONSTRAINT `PraxisBewertung_stationId_fkey` FOREIGN KEY (`stationId`) REFERENCES `Bewerbstation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BewertungskriteriumBewertung` ADD CONSTRAINT `BewertungskriteriumBewertung_kriteriumId_fkey` FOREIGN KEY (`kriteriumId`) REFERENCES `Bewertungskriterium`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BewertungskriteriumBewertung` ADD CONSTRAINT `BewertungskriteriumBewertung_bewertungId_fkey` FOREIGN KEY (`bewertungId`) REFERENCES `PraxisBewertung`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TheorieBewertung` ADD CONSTRAINT `TheorieBewertung_gruppeId_fkey` FOREIGN KEY (`gruppeId`) REFERENCES `Bewerbsteam`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TheorieBewertung` ADD CONSTRAINT `TheorieBewertung_stationId_fkey` FOREIGN KEY (`stationId`) REFERENCES `Bewerbstation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TheorieBewertung` ADD CONSTRAINT `TheorieBewertung_teilnehmerId_fkey` FOREIGN KEY (`teilnehmerId`) REFERENCES `Bewerbsteilnehmer`(`pernr`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TheorieAntworten` ADD CONSTRAINT `TheorieAntworten_bewertungId_fkey` FOREIGN KEY (`bewertungId`) REFERENCES `TheorieBewertung`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TheorieAntworten` ADD CONSTRAINT `TheorieAntworten_antwortId_fkey` FOREIGN KEY (`antwortId`) REFERENCES `MultipleChoiceQuestionAnswer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SozialBewertung` ADD CONSTRAINT `SozialBewertung_gruppeId_fkey` FOREIGN KEY (`gruppeId`) REFERENCES `Bewerbsteam`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SozialBewertung` ADD CONSTRAINT `SozialBewertung_stationId_fkey` FOREIGN KEY (`stationId`) REFERENCES `Bewerbstation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SozialBewertung` ADD CONSTRAINT `SozialBewertung_helfiRundeId_fkey` FOREIGN KEY (`helfiRundeId`) REFERENCES `SozialstationHelfiRunde`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SozialBewertung` ADD CONSTRAINT `SozialBewertung_jugendBegriffId_fkey` FOREIGN KEY (`jugendBegriffId`) REFERENCES `SozialstationJugendBegriff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SozialstationHelfiRunde` ADD CONSTRAINT `SozialstationHelfiRunde_sozialstationId_fkey` FOREIGN KEY (`sozialstationId`) REFERENCES `Sozialstation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SozialstationJugendBegriff` ADD CONSTRAINT `SozialstationJugendBegriff_sozialstationId_fkey` FOREIGN KEY (`sozialstationId`) REFERENCES `Sozialstation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ZivilcourageBewertung` ADD CONSTRAINT `ZivilcourageBewertung_gruppeId_fkey` FOREIGN KEY (`gruppeId`) REFERENCES `Bewerbsteam`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ZivilcourageBewertung` ADD CONSTRAINT `ZivilcourageBewertung_stationId_fkey` FOREIGN KEY (`stationId`) REFERENCES `Bewerbstation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ZivilcourageBewertung` ADD CONSTRAINT `ZivilcourageBewertung_helfiAussageId_fkey` FOREIGN KEY (`helfiAussageId`) REFERENCES `ZivilcurageHelfiAussage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ZivilcourageBewertung` ADD CONSTRAINT `ZivilcourageBewertung_jugendBegriffId_fkey` FOREIGN KEY (`jugendBegriffId`) REFERENCES `ZivilcurageJugendBegriff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ZivilcurageHelfiAussage` ADD CONSTRAINT `ZivilcurageHelfiAussage_zivilcurageStationId_fkey` FOREIGN KEY (`zivilcurageStationId`) REFERENCES `ZivilcurageStation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ZivilcurageJugendBegriff` ADD CONSTRAINT `ZivilcurageJugendBegriff_zivilcurageStationId_fkey` FOREIGN KEY (`zivilcurageStationId`) REFERENCES `ZivilcurageStation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
