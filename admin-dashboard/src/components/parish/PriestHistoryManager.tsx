import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  User,
  Plus,
  Pencil,
  History,
  Calendar,
  ArrowRightLeft,
  CheckCircle2,
} from 'lucide-react';
import type { PriestAssignment } from '@/types/church';

interface PriestHistoryManagerProps {
  currentPriest: string;
  priest_assignment: PriestAssignment[];
  onUpdateCurrentPriest: (name: string) => void;
  onUpdateHistory: (history: PriestAssignment[]) => void;
  disabled?: boolean;
}

/**
 * PriestHistoryManager - Manages the current parish priest and maintains a
 * historical record of all past priest assignments.
 *
 * When a new priest is assigned:
 * 1. The previous priest's record gets an endDate (today)
 * 2. A new record is created with isCurrent: true
 * 3. The assignedPriest field is updated to the new name
 * 
 * Past records are never deleted — only updated with end dates.
 */
export const PriestHistoryManager: React.FC<PriestHistoryManagerProps> = ({
  currentPriest,
  priest_assignment,
  onUpdateCurrentPriest,
  onUpdateHistory,
  disabled = false,
}) => {
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [showEditHistoryDialog, setShowEditHistoryDialog] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Reassign form state
  const [newPriestName, setNewPriestName] = useState('');
  const [reassignStartDate, setReassignStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [reassignNotes, setReassignNotes] = useState('');

  // Edit history entry state
  const [editName, setEditName] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Sort history: current first, then by startDate descending
  const sortedHistory = [...priest_assignment].sort((a, b) => {
    if (a.isCurrent && !b.isCurrent) return -1;
    if (!a.isCurrent && b.isCurrent) return 1;
    return (b.startDate || '').localeCompare(a.startDate || '');
  });

  const handleReassign = () => {
    if (!newPriestName.trim()) return;

    const updatedHistory = priest_assignment.map((entry) =>
      entry.isCurrent
        ? { ...entry, isCurrent: false, endDate: reassignStartDate }
        : entry
    );

    // Add new assignment
    const newAssignment: PriestAssignment = {
      name: newPriestName.trim(),
      startDate: reassignStartDate,
      isCurrent: true,
      notes: reassignNotes.trim() || undefined,
    };
    updatedHistory.push(newAssignment);

    onUpdateHistory(updatedHistory);
    onUpdateCurrentPriest(newPriestName.trim());

    // Reset form
    setNewPriestName('');
    setReassignStartDate(new Date().toISOString().split('T')[0]);
    setReassignNotes('');
    setShowReassignDialog(false);
  };

  const handleEditEntry = (index: number) => {
    const entry = sortedHistory[index];
    setEditingIndex(index);
    setEditName(entry.name);
    setEditStartDate(entry.startDate || '');
    setEditEndDate(entry.endDate || '');
    setEditNotes(entry.notes || '');
    setShowEditHistoryDialog(true);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null || !editName.trim()) return;

    const entryToEdit = sortedHistory[editingIndex];
    const originalIndex = priest_assignment.findIndex(
      (e) => e.name === entryToEdit.name && e.startDate === entryToEdit.startDate
    );

    if (originalIndex === -1) return;

    const updatedHistory = [...priest_assignment];
    updatedHistory[originalIndex] = {
      ...updatedHistory[originalIndex],
      name: editName.trim(),
      startDate: editStartDate,
      endDate: editEndDate || undefined,
      notes: editNotes.trim() || undefined,
    };

    onUpdateHistory(updatedHistory);

    // If editing the current priest, also update the main field
    if (updatedHistory[originalIndex].isCurrent) {
      onUpdateCurrentPriest(editName.trim());
    }

    setShowEditHistoryDialog(false);
    setEditingIndex(null);
  };

  const handleInitializeHistory = () => {
    // Initialize priest history from the current priest name if history is empty
    if (currentPriest && priest_assignment.length === 0) {
      const initialEntry: PriestAssignment = {
        name: currentPriest,
        startDate: new Date().toISOString().split('T')[0],
        isCurrent: true,
      };
      onUpdateHistory([initialEntry]);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Present';
    try {
      // Handle year-only format
      if (/^\d{4}$/.test(dateStr)) return dateStr;
      return new Date(dateStr).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const currentEntry = sortedHistory.find((e) => e.isCurrent);
  const pastEntries = sortedHistory.filter((e) => !e.isCurrent);

  return (
    <div className="space-y-4">
      {/* Current Parish Priest */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700">
          Current Parish Priest <span className="text-red-500">*</span>
        </Label>

        {currentEntry ? (
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{currentEntry.name}</p>
                    <p className="text-xs text-gray-500">
                      Since {formatDate(currentEntry.startDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Current
                  </Badge>
                  {!disabled && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReassignDialog(true)}
                      className="text-xs"
                    >
                      <ArrowRightLeft className="w-3 h-3 mr-1" />
                      Reassign
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <Input
              value={currentPriest}
              onChange={(e) => onUpdateCurrentPriest(e.target.value)}
              placeholder="Rev. Fr. [Full Name]"
              className="h-9 text-sm"
              disabled={disabled}
            />
            {currentPriest && priest_assignment.length === 0 && !disabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleInitializeHistory}
                className="text-xs text-emerald-600 hover:text-emerald-700"
              >
                <Plus className="w-3 h-3 mr-1" />
                Initialize assignment record
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Past Priests History */}
      {pastEntries.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-gray-500" />
            <Label className="text-sm font-medium text-gray-600">
              Previous Parish Priests
            </Label>
            <Badge variant="secondary" className="text-xs">
              {pastEntries.length} record{pastEntries.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="space-y-1">
            {pastEntries.map((entry, idx) => (
              <div
                key={`${entry.name}-${entry.startDate}-${idx}`}
                className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{entry.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(entry.startDate)} — {formatDate(entry.endDate)}
                    </p>
                    {entry.notes && (
                      <p className="text-xs text-gray-400 italic mt-0.5">{entry.notes}</p>
                    )}
                  </div>
                </div>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleEditEntry(sortedHistory.indexOf(entry))
                    }
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty history info */}
      {priest_assignment.length === 0 && currentPriest && (
        <p className="text-xs text-gray-400 italic">
          No assignment history recorded yet. Click "Initialize assignment record" to start tracking.
        </p>
      )}

      {/* Reassign Dialog */}
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              Reassign Parish Priest
            </DialogTitle>
            <DialogDescription>
              The current priest ({currentEntry?.name}) will be moved to the history
              record. Enter the new priest's information below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="newPriestName" className="text-sm font-medium">
                New Parish Priest <span className="text-red-500">*</span>
              </Label>
              <Input
                id="newPriestName"
                value={newPriestName}
                onChange={(e) => setNewPriestName(e.target.value)}
                placeholder="Rev. Fr. [Full Name]"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reassignStartDate" className="text-sm font-medium">
                Assignment Start Date
              </Label>
              <Input
                id="reassignStartDate"
                type="date"
                value={reassignStartDate}
                onChange={(e) => setReassignStartDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reassignNotes" className="text-sm font-medium">
                Notes (optional)
              </Label>
              <Input
                id="reassignNotes"
                value={reassignNotes}
                onChange={(e) => setReassignNotes(e.target.value)}
                placeholder="e.g., Transferred to another parish"
                className="h-9"
              />
            </div>

            {/* Preview */}
            <Separator />
            <div className="text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-700">What will happen:</p>
              <p>
                • <span className="font-medium">{currentEntry?.name}</span> will be recorded
                as priest until {formatDate(reassignStartDate)}
              </p>
              <p>
                • <span className="font-medium">{newPriestName || '[New Priest]'}</span> will
                be set as the current priest starting {formatDate(reassignStartDate)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReassignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReassign} disabled={!newPriestName.trim()}>
              <ArrowRightLeft className="w-4 h-4 mr-1" />
              Confirm Reassignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit History Entry Dialog */}
      <Dialog open={showEditHistoryDialog} onOpenChange={setShowEditHistoryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-600" />
              Edit Assignment Record
            </DialogTitle>
            <DialogDescription>
              Update the details for this priest assignment record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="editName" className="text-sm font-medium">
                Priest Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Rev. Fr. [Full Name]"
                className="h-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="editStartDate" className="text-sm font-medium">
                  Start Date
                </Label>
                <Input
                  id="editStartDate"
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editEndDate" className="text-sm font-medium">
                  End Date
                </Label>
                <Input
                  id="editEndDate"
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editNotes" className="text-sm font-medium">
                Notes (optional)
              </Label>
              <Input
                id="editNotes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Optional notes about this assignment"
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditHistoryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PriestHistoryManager;
