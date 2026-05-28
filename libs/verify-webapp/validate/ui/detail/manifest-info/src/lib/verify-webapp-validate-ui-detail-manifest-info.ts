import { Component, inject } from '@angular/core';
import { VerifyStore } from '@c2pa-mcnl/verify-webapp/validate/data-access';
import { VerifyWebappValidateUiFileCard } from '@c2pa-mcnl/verify-webapp/validate/ui/file-card';

@Component({
  selector: 'lib-verify-webapp-validate-ui-detail-manifest-info',
  imports: [VerifyWebappValidateUiFileCard],
  templateUrl: './verify-webapp-validate-ui-detail-manifest-info.html',
  styleUrl: './verify-webapp-validate-ui-detail-manifest-info.css',
})
export class VerifyWebappValidateUiDetailManifestInfo {
  readonly store = inject(VerifyStore);

  public ReadableActions: Record<string, string> = {
    'c2pa.addedText':
      '(zichtbare) Tekstuele inhoud is toegevoegd aan het asset, bijvoorbeeld op een tekstlaag of als bijschrift',
    'c2pa.adjustedColor': 'Wijzigingen in toon, verzadiging, enzovoort',
    'c2pa.changedSpeed':
      'Afspelsnelheid van een video- of audiotrack verlaagd of verhoogd',
    'c2pa.color_adjustments': 'Wijzigingen in toon, verzadiging, enzovoort',
    'c2pa.converted': 'Het formaat van het asset is gewijzigd',
    'c2pa.created': 'Het asset is voor het eerst aangemaakt',
    'c2pa.cropped':
      'Delen van de digitale inhoud van het asset zijn bijgesneden',
    'c2pa.deleted':
      'Delen van de digitale inhoud van het asset zijn verwijderd',
    'c2pa.drawing':
      'Wijzigingen aangebracht met tekengereedschappen zoals penselen of gummen',
    'c2pa.dubbed':
      'Wijzigingen aangebracht in audio, meestal één of meerdere tracks van een samengesteld asset',
    'c2pa.edited':
      'Algemene acties die als redactionele transformaties van de inhoud worden beschouwd',
    'c2pa.edited.metadata':
      'Wijzigingen in assetmetadata of een metadata-assertie, maar niet in de digitale inhoud van het asset',
    'c2pa.enhanced':
      'Verbeteringen toegepast zoals ruisonderdrukking, multi-band compressie of verscherping die niet-redactionele transformaties van de inhoud vertegenwoordigen',
    'c2pa.filtered':
      'Wijzigingen in uiterlijk met toegepaste filters, stijlen, enzovoort',
    'c2pa.opened':
      'Een bestaand asset is geopend en wordt ingesteld als parentOf ingredient',
    'c2pa.orientation': 'Wijzigingen in de richting en positie van de inhoud',
    'c2pa.placed':
      'Een of meer componentOf ingredienten toegevoegd/geplaatst in het asset',
    'c2pa.published': 'Asset is vrijgegeven aan een breder publiek',
    'c2pa.redacted': 'Een of meer assertions zijn geredigeerd',
    'c2pa.removed': 'Een componentOf ingredient is verwijderd',
    'c2pa.repackaged':
      'Een conversie van het ene verpakking- of containerformaat naar het andere. Inhoud wordt herverpakt zonder transcodering en wordt beschouwd als een niet-redactionele transformatie van het parentOf ingredient',
    'c2pa.resized':
      'Wijzigingen in de inhoudsafmetingen, bestandsgrootte of beide',
    'c2pa.transcoded':
      'Een conversie van de ene codering naar de andere, inclusief resolutieschaling, bitrate-aanpassing en wijziging van het coderingsformaat, beschouwd als een niet-redactionele transformatie van het parentOf ingredient',
    'c2pa.translated': 'Wijzigingen in de taal van de inhoud',
    'c2pa.trimmed': 'Verwijdering van een tijdsbereik van de inhoud',
    'c2pa.unknown':
      'Er is iets gebeurd, maar de claim_generator kan niet specificeren wat',
    'c2pa.watermarked':
      'Een onzichtbaar watermerk is toegevoegd aan de digitale inhoud voor het creëren van een soft binding',
  };
}
