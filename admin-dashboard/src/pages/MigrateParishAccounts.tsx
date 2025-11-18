import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { generateParishId, formatParishFullName, getMunicipalitiesByDiocese } from '@/lib/parish-utils';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Church as ChurchIcon,
  ArrowRight,
  Loader2 
} from 'lucide-react';

interface LegacyAccount {
  id: string;
  uid: string;
  name: string;
  email: string;
  diocese: 'tagbilaran' | 'talibon';
  parish: string;
  role: string;
  status: string;
  hasParishId: boolean;
  hasChurchData: boolean;
  suggestedMunicipality?: string; // Auto-detected from church data
}

interface MigrationItem {
  account: LegacyAccount;
  municipality: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  newParishId?: string;
}

export const MigrateParishAccounts = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [legacyAccounts, setLegacyAccounts] = useState<LegacyAccount[]>([]);
  const [migrations, setMigrations] = useState<MigrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    loadLegacyAccounts();
  }, []);

  const loadLegacyAccounts = async () => {
    try {
      setLoading(true);

      // Load all parish secretary accounts
      const usersRef = collection(db, 'users');
      const usersQuery = query(
        usersRef,
        where('role', '==', 'parish_secretary')
      );

      const snapshot = await getDocs(usersQuery);
      const accounts: LegacyAccount[] = [];

      for (const userDoc of snapshot.docs) {
        const data = userDoc.data();
        
        // Check if account needs migration (missing parishId or parishInfo)
        const needsMigration = !data.parishId || !data.parishInfo;
        
        if (needsMigration) {
          // Check if this parish has church data
          const churchDoc = await getDoc(doc(db, 'churches', data.parish || userDoc.id));
          const churchData = churchDoc.exists() ? churchDoc.data() : null;
          
          // Try to extract municipality from existing church data
          const existingMunicipality = churchData?.locationDetails?.municipality || 
                                      churchData?.municipality || 
                                      '';
          
          accounts.push({
            id: userDoc.id,
            uid: data.uid,
            name: data.name || data.parish,
            email: data.email,
            diocese: data.diocese,
            parish: data.parish || data.name,
            role: data.role,
            status: data.status,
            hasParishId: !!data.parishId,
            hasChurchData: churchDoc.exists(),
            suggestedMunicipality: existingMunicipality
          });
        }
      }

      setLegacyAccounts(accounts);
      
      // Initialize migration items with suggested municipalities
      setMigrations(accounts.map(account => ({
        account,
        municipality: account.suggestedMunicipality || '', // Pre-populate if available
        status: 'pending'
      })));

      const autoDetectedCount = accounts.filter(a => a.suggestedMunicipality).length;
      const manualCount = accounts.length - autoDetectedCount;

      toast({
        title: "Scan Complete",
        description: `Found ${accounts.length} account(s) that need migration. ${autoDetectedCount > 0 ? `${autoDetectedCount} municipality auto-detected, ${manualCount} need manual selection.` : 'Please select municipality for each account.'}`,
      });

    } catch (error) {
      console.error('Error loading legacy accounts:', error);
      toast({
        title: "Error",
        description: "Failed to load accounts for migration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateMigration = (index: number, updates: Partial<MigrationItem>) => {
    setMigrations(prev => prev.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    ));
  };

  const canStartMigration = () => {
    return migrations.length > 0 && migrations.every(m => m.municipality !== '');
  };

  const startMigration = async () => {
    if (!canStartMigration()) {
      toast({
        title: "Validation Error",
        description: "Please select municipality for all accounts",
        variant: "destructive"
      });
      return;
    }

    setMigrating(true);
    setShowConfirm(false);

    for (let i = 0; i < migrations.length; i++) {
      const migration = migrations[i];
      updateMigration(i, { status: 'processing' });

      try {
        await migrateAccount(migration);
        updateMigration(i, { status: 'completed' });
      } catch (error) {
        console.error('Migration error:', error);
        updateMigration(i, { 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    setMigrating(false);
    
    const successCount = migrations.filter(m => m.status === 'completed').length;
    const errorCount = migrations.filter(m => m.status === 'error').length;

    toast({
      title: "Migration Complete",
      description: `${successCount} account(s) migrated successfully. ${errorCount} error(s).`,
      variant: errorCount > 0 ? "destructive" : "default"
    });
  };

  const migrateAccount = async (migration: MigrationItem) => {
    const { account, municipality } = migration;

    // Generate new parish ID
    const newParishId = generateParishId(account.diocese, municipality, account.parish);
    const parishFullName = formatParishFullName(account.parish, municipality);

    // Check if new parishId already exists
    const existingCheck = await getDocs(
      query(
        collection(db, 'users'),
        where('parishId', '==', newParishId),
        where('role', '==', 'parish_secretary')
      )
    );

    if (!existingCheck.empty && existingCheck.docs[0].id !== account.id) {
      throw new Error(`Parish ID ${newParishId} already exists. Cannot migrate.`);
    }

    // Update user document
    const userRef = doc(db, 'users', account.id);
    await updateDoc(userRef, {
      parishId: newParishId,
      parishInfo: {
        name: account.parish,
        municipality: municipality,
        fullName: parishFullName
      },
      parish: newParishId, // Update legacy field to new ID
      updatedAt: new Date(),
      migratedAt: new Date(),
      migratedBy: userProfile?.uid || 'system'
    });

    // Migrate church document if exists
    if (account.hasChurchData) {
      const oldChurchRef = doc(db, 'churches', account.parish);
      const newChurchRef = doc(db, 'churches', newParishId);

      // Check if church doc exists at old location
      const oldChurchDoc = await getDoc(oldChurchRef);
      
      if (oldChurchDoc.exists()) {
        const churchData = oldChurchDoc.data();
        
        // Create new church document with updated ID
        await setDoc(newChurchRef, {
          ...churchData,
          id: newParishId,
          parishId: newParishId,
          locationDetails: {
            ...churchData.locationDetails,
            municipality: municipality
          },
          updatedAt: new Date(),
          migratedAt: new Date(),
          migratedFrom: account.parish
        });

        // Delete old church document
        await deleteDoc(oldChurchRef);
      }
    }

    updateMigration(migrations.indexOf(migration), { newParishId });
  };

  if (!userProfile || userProfile.role !== 'chancery_office') {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access Denied. Only Chancery Office can access this migration tool.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChurchIcon className="w-6 h-6" />
            Parish Account Migration Tool
          </CardTitle>
          <CardDescription>
            Migrate legacy parish accounts to the new unique identifier system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Instructions */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>What this does:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Adds unique parish identifiers to old accounts</li>
                <li>Updates church documents to use new IDs</li>
                <li>Preserves all existing church data</li>
                <li>Enables duplicate prevention for migrated accounts</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Scanning for accounts...</span>
            </div>
          )}

          {/* No Accounts Found */}
          {!loading && legacyAccounts.length === 0 && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>All accounts are up to date!</strong> No migration needed.
              </AlertDescription>
            </Alert>
          )}

          {/* Migration List */}
          {!loading && legacyAccounts.length > 0 && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Accounts to Migrate ({migrations.length})</h3>
                  {!migrating && (
                    <Button
                      onClick={() => setShowConfirm(true)}
                      disabled={!canStartMigration()}
                      className="btn-heritage"
                    >
                      Start Migration
                    </Button>
                  )}
                </div>

                {migrations.map((migration, index) => (
                  <Card key={migration.account.id} className={
                    migration.status === 'completed' ? 'border-green-500 bg-green-50' :
                    migration.status === 'error' ? 'border-red-500 bg-red-50' :
                    migration.status === 'processing' ? 'border-blue-500 bg-blue-50' :
                    ''
                  }>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Status Icon */}
                        <div className="pt-1">
                          {migration.status === 'completed' && (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          )}
                          {migration.status === 'error' && (
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          )}
                          {migration.status === 'processing' && (
                            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                          )}
                          {migration.status === 'pending' && (
                            <Clock className="w-5 h-5 text-gray-400" />
                          )}
                        </div>

                        {/* Account Info */}
                        <div className="flex-1 space-y-3">
                          <div>
                            <div className="font-semibold">{migration.account.name}</div>
                            <div className="text-sm text-muted-foreground">{migration.account.email}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{migration.account.diocese}</Badge>
                              {migration.account.hasChurchData && (
                                <Badge variant="secondary" className="text-xs">
                                  <ChurchIcon className="w-3 h-3 mr-1" />
                                  Has Church Data
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Municipality Selection */}
                          {migration.status === 'pending' && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                Select Municipality *
                                {migration.account.suggestedMunicipality && (
                                  <Badge variant="secondary" className="text-xs ml-2">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Auto-detected
                                  </Badge>
                                )}
                              </Label>
                              {migration.account.suggestedMunicipality && (
                                <Alert className="bg-blue-50 border-blue-200 py-2">
                                  <AlertDescription className="text-blue-900 text-xs">
                                    Found existing municipality: <strong>{migration.account.suggestedMunicipality}</strong> (from church data). 
                                    You can change it if incorrect.
                                  </AlertDescription>
                                </Alert>
                              )}
                              <Select
                                value={migration.municipality}
                                onValueChange={(value) => updateMigration(index, { municipality: value })}
                                disabled={migrating}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Choose municipality..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {getMunicipalitiesByDiocese(migration.account.diocese).map((mun) => (
                                    <SelectItem key={mun} value={mun}>
                                      {mun}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {migration.municipality && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <ArrowRight className="w-4 h-4" />
                                  <span>Will become: <strong>{formatParishFullName(migration.account.parish, migration.municipality)}</strong></span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Completed State */}
                          {migration.status === 'completed' && migration.newParishId && (
                            <div className="text-sm text-green-700 bg-green-100 p-2 rounded">
                              <div>✅ Migrated successfully</div>
                              <div className="font-mono text-xs mt-1">New ID: {migration.newParishId}</div>
                            </div>
                          )}

                          {/* Error State */}
                          {migration.status === 'error' && (
                            <div className="text-sm text-red-700 bg-red-100 p-2 rounded">
                              <div>❌ Migration failed</div>
                              <div className="text-xs mt-1">{migration.error}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="w-5 h-5" />
                Confirm Migration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>Warning:</strong> This action will:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Update {migrations.length} user account(s)</li>
                    <li>Move church documents to new IDs</li>
                    <li>Delete old church document locations</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="text-sm text-muted-foreground">
                Make sure you have selected the correct municipality for each parish before proceeding.
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={startMigration}
                  className="flex-1 btn-heritage"
                >
                  Confirm & Migrate
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// Missing import fix
import { Label } from '@/components/ui/label';
